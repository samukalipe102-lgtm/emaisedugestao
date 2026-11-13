// ============================================================================
// Orquestração: transforma e-mails recebidos em solicitações, gera disparos
// automáticos, valida correções contra a Base Oficial e processa a fila de
// envio em lotes com cronômetros regressivos.
//
// Regra central: NENHUMA solicitação é criada manualmente. Elas nascem apenas
// quando `verificarCaixa()` captura um e-mail real na conta institucional.
// ============================================================================
import type {
  VerificacaoResultado,
  StatusTempoReal,
  Solicitacao,
  CorrecaoStatus,
} from "../shared/types";
import * as db from "./db";
import * as cfg from "./config";
import * as email from "./email";
import type { EmailRecebido } from "./email";
import { gerarProtocolo } from "./protocol";
import {
  confirmacaoRecebimento,
  solicitacaoCorrecao,
  confirmacaoAprovacao,
} from "./templates";

const STUCK_SEGUNDOS = 120; // recupera itens travados > 2 minutos

// Estado dos cronômetros (em memória; segundos restantes)
let timerVerificacao: number | null = null; // próxima leitura da caixa
let timerLote: number | null = null; // próximo lote de envio
let emitirAtualizacao: () => void = () => {};

// Flags de concorrência (lock de fila e de leitura)
let processandoFila = false;
let lendoCaixa = false;

export function registrarEmissor(cb: () => void): void {
  emitirAtualizacao = cb;
}

// ---------------------------------------------------------------- Enfileirar
function enfileirarDisparo(
  sol: Solicitacao,
  destinatario: string,
  assunto: string,
  corpo: string
): number {
  const fila = cfg.obterConfig().fila;
  const filaId = db.enfileirar({
    solicitacaoId: sol.id,
    protocolo: sol.protocolo,
    destinatario,
    assunto,
    corpo,
    maxTentativas: fila.tentativasPorMensagem,
    agendadoPara: new Date().toISOString(), // elegível já no próximo lote
  });
  db.adicionarHistorico({
    solicitacaoId: sol.id,
    remetente: "sistema",
    de: cfg.obterConfig().conta.email,
    para: destinatario,
    assunto,
    corpo,
    anexos: [],
    status: "Aguardando",
    filaId,
    criadoEm: new Date().toISOString(),
    enviadoEm: null,
  });
  return filaId;
}

// ---------------------------------------------- Validação contra Base Oficial
function validarContraBase(sol: Solicitacao): { pendencias: string[]; status: CorrecaoStatus } {
  const pendencias: string[] = [];
  const d = sol.dados;
  if (!d.matricula) {
    pendencias.push("Matrícula não informada (identificador principal obrigatório).");
    return { pendencias, status: "Divergente" };
  }
  const base = db.buscarNaBasePorMatricula(d.matricula);
  if (!base) {
    pendencias.push(`Matrícula ${d.matricula} não encontrada na Base Oficial.`);
    return { pendencias, status: "Divergente" };
  }
  const cmp = (campo: string, informado: string | null, oficial: string | null) => {
    if (informado && oficial && informado.trim().toLowerCase() !== oficial.trim().toLowerCase()) {
      pendencias.push(`${campo}: informado "${informado}" diverge da Base Oficial "${oficial}".`);
    }
  };
  cmp("Aluno", d.aluno, base.nome);
  cmp("Turma", d.turma, base.turma);
  cmp("Unidade escolar", d.unidade, base.unidade);
  cmp("Município", d.municipio, base.municipio);
  cmp("E-mail do responsável", d.emailResponsavel, base.emailResponsavel);
  return { pendencias, status: pendencias.length ? "Divergente" : "Validado" };
}

// ----------------------------------------------------- Processar e-mail novo
function processarEmailNovo(e: EmailRecebido): "nova" | "resposta" | "ignorada" {
  // 1) É resposta de um protocolo existente?
  if (e.protocolo) {
    const existente = db.obterSolicitacaoPorProtocolo(e.protocolo);
    if (existente) {
      db.adicionarHistorico({
        solicitacaoId: existente.id,
        remetente: "solicitante",
        de: e.de,
        para: cfg.obterConfig().conta.email,
        assunto: e.assunto,
        corpo: e.corpoTexto,
        anexos: e.anexos,
        status: "Recebido",
        filaId: null,
        criadoEm: e.data.toISOString(),
        enviadoEm: null,
      });
      // Resposta reabre análise; se estava aguardando correção, revalida.
      if (existente.status === "Aguardando correção") {
        const novosDados = email.extrairDados(e.corpoTexto);
        db.atualizarDadosSolicitacao(existente.id, descartarVazios(novosDados));
        const atualizado = db.obterSolicitacao(existente.id)!;
        const { pendencias, status } = validarContraBase(atualizado);
        db.atualizarCorrecao(atualizado.id, status, pendencias);
        db.atualizarStatusSolicitacao(atualizado.id, status === "Validado" ? "Em análise" : "Aguardando correção");
        if (status === "Divergente") {
          enfileirarDisparo(atualizado, e.de, `Re: ${existente.assunto}`, solicitacaoCorrecao(atualizado, pendencias));
        }
      } else {
        db.atualizarStatusSolicitacao(existente.id, "Em análise");
      }
      db.registrarAuditoria({
        tipo: "automatico",
        categoria: "E-mail recebido",
        descricao: `Resposta vinculada ao protocolo ${e.protocolo} (${e.de}).`,
        protocolo: e.protocolo,
      });
      return "resposta";
    }
    // protocolo não reconhecido -> trata como nova (abaixo)
  }

  // 2) Nova solicitação
  const processos = db.listarProcessos().filter((p) => p.ativo);
  const cls = email.classificar(e.assunto, e.corpoTexto, processos);
  const dados = email.extrairDados(e.corpoTexto);
  if (!dados.emailResponsavel) dados.emailResponsavel = e.de;
  const protocolo = gerarProtocolo();
  const sol = db.criarSolicitacao({
    protocolo,
    assunto: e.assunto,
    setor: cls.setor,
    processoId: cls.processoId,
    processoNome: cls.processoNome,
    dados,
    pendencias: [],
    emailOrigem: e.de,
  });
  // histórico: e-mail original (nunca vazio)
  db.adicionarHistorico({
    solicitacaoId: sol.id,
    remetente: "solicitante",
    de: e.de,
    para: cfg.obterConfig().conta.email,
    assunto: e.assunto,
    corpo: e.corpoTexto,
    anexos: e.anexos,
    status: "Recebido",
    filaId: null,
    criadoEm: e.data.toISOString(),
    enviadoEm: null,
  });

  // valida contra a base e já encaminha o fluxo
  const { pendencias, status } = validarContraBase(sol);
  db.atualizarCorrecao(sol.id, status, pendencias);

  // 1º disparo automático: confirmação de recebimento
  enfileirarDisparo(sol, e.de, `Recebemos sua solicitação`, confirmacaoRecebimento(sol));

  // se já há divergência, pede correção
  if (status === "Divergente") {
    db.incrementarPedidoCorrecao(sol.id);
    enfileirarDisparo(sol, e.de, `Correção necessária`, solicitacaoCorrecao(sol, pendencias));
  } else {
    db.atualizarStatusSolicitacao(sol.id, "Em análise");
  }

  db.registrarAuditoria({
    tipo: "automatico",
    categoria: "Solicitação criada",
    descricao: `Nova solicitação "${cls.processoNome}" (${cls.setor}) a partir de e-mail de ${e.de}.`,
    protocolo,
  });
  return "nova";
}

function descartarVazios(d: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) if (v) out[k] = v;
  return out;
}

// ------------------------------------------------------------ Verificar caixa
export async function verificarCaixa(): Promise<VerificacaoResultado> {
  if (lendoCaixa) {
    return { novas: 0, respostas: 0, ignoradas: 0, mensagem: "Leitura já em andamento." };
  }
  const conta = cfg.obterConfig().conta;
  if (!conta.email || !conta.senhaApp) {
    return { novas: 0, respostas: 0, ignoradas: 0, mensagem: "Conta institucional não configurada." };
  }
  lendoCaixa = true;
  let novas = 0, respostas = 0, ignoradas = 0;
  try {
    const recebidos = await email.lerNaoVistos(conta);
    for (const e of recebidos) {
      if (db.jaProcessado(e.messageId)) {
        ignoradas++;
        continue;
      }
      db.marcarEmailProcessado(e.messageId);
      const r = processarEmailNovo(e);
      if (r === "nova") novas++;
      else if (r === "resposta") respostas++;
      else ignoradas++;
    }
    cfg.definirConectado(true);
    return {
      novas,
      respostas,
      ignoradas,
      mensagem: `Caixa verificada: ${novas} nova(s), ${respostas} resposta(s), ${ignoradas} ignorada(s).`,
    };
  } catch (e: any) {
    cfg.definirConectado(false);
    db.registrarAuditoria({
      tipo: "automatico",
      categoria: "Erro de leitura",
      descricao: `Falha ao verificar a caixa: ${e?.message ?? String(e)}`,
      protocolo: null,
    });
    return { novas, respostas, ignoradas, mensagem: `Falha ao verificar a caixa: ${e?.message ?? String(e)}` };
  } finally {
    lendoCaixa = false;
    emitirAtualizacao();
  }
}

// ------------------------------------------------------------- Processar fila
export async function processarFila(): Promise<{ enviados: number; falhas: number }> {
  if (processandoFila) return { enviados: 0, falhas: 0 };
  processandoFila = true;
  let enviados = 0, falhas = 0;
  try {
    db.recuperarTravados(STUCK_SEGUNDOS);
    const conf = cfg.obterConfig();
    if (!conf.fila.ativa) return { enviados: 0, falhas: 0 };

    const lote = db.proximoLote(conf.fila.mensagensPorLote);
    for (const item of lote) {
      db.marcarProcessando(item.id);
      emitirAtualizacao();
      try {
        await email.enviarEmail(conf.conta, item.destinatario, item.assunto, item.corpo, item.protocolo);
        db.marcarEnviado(item.id);
        db.atualizarStatusHistoricoPorFila(item.id, "Enviado", new Date().toISOString());
        enviados++;
        db.registrarAuditoria({
          tipo: "automatico",
          categoria: "E-mail enviado",
          descricao: `Enviado para ${item.destinatario} — ${item.assunto}.`,
          protocolo: item.protocolo,
        });
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        const restam = item.maxTentativas - (item.tentativas + 1);
        // espera progressiva: tentativa 1 -> +1min, 2 -> +2min, ...
        const reagendar = restam > 0
          ? new Date(Date.now() + (item.tentativas + 1) * 60_000).toISOString()
          : null;
        db.marcarFalha(item.id, msg, reagendar);
        if (!reagendar) {
          db.atualizarStatusHistoricoPorFila(item.id, "Com falha", null);
          falhas++;
        }
        db.registrarAuditoria({
          tipo: "automatico",
          categoria: "Falha de envio",
          descricao: `Falha ao enviar para ${item.destinatario}: ${msg}`,
          protocolo: item.protocolo,
        });
      }
    }
    return { enviados, falhas };
  } finally {
    processandoFila = false;
    emitirAtualizacao();
  }
}

// ------------------------------------------------------------- Cronômetros
export function iniciarCronometros(): void {
  reiniciarVerificacao();
  reiniciarLote();
  setInterval(tick, 1000);
}

function reiniciarVerificacao(): void {
  const m = cfg.obterConfig().monitoramento;
  timerVerificacao = Math.max(1, m.intervaloMin) * 60;
}

function reiniciarLote(): void {
  const f = cfg.obterConfig().fila;
  timerLote = Math.max(5, f.intervaloLoteMin) * 60;
}

/** Chamado a cada segundo: decrementa timers e dispara ações em 00:00. */
async function tick(): Promise<void> {
  const conf = cfg.obterConfig();
  const ativo = conf.monitoramento.sincronizacaoAutomatica && cfg.dentroDoHorario();

  if (timerVerificacao !== null) {
    if (ativo) timerVerificacao--;
    if (timerVerificacao <= 0) {
      reiniciarVerificacao();
      if (ativo) await verificarCaixa();
    }
  }

  if (timerLote !== null) {
    if (ativo && conf.fila.ativa) timerLote--;
    if (timerLote <= 0) {
      reiniciarLote();
      if (ativo && conf.fila.ativa) await processarFila();
    }
  }
  emitirAtualizacao();
}

/** Reaplica as configs aos cronômetros (chamado após salvar monitoramento/fila). */
export function sincronizarCronometros(): void {
  // recalcula o teto preservando a contagem corrente se menor que o novo teto
  const m = cfg.obterConfig().monitoramento;
  const f = cfg.obterConfig().fila;
  const tetoVerif = Math.max(1, m.intervaloMin) * 60;
  const tetoLote = Math.max(5, f.intervaloLoteMin) * 60;
  if (timerVerificacao === null || timerVerificacao > tetoVerif) timerVerificacao = tetoVerif;
  if (timerLote === null || timerLote > tetoLote) timerLote = tetoLote;
}

// ------------------------------------------------------------- Status
export function status(): StatusTempoReal {
  const conf = cfg.obterConfig();
  return {
    contaConectada: conf.conta.conectado,
    contaEmail: conf.conta.email,
    filaAtiva: conf.fila.ativa,
    monitoramentoAtivo: conf.monitoramento.sincronizacaoAutomatica && cfg.dentroDoHorario(),
    proximoLoteSegundos: timerLote,
    proximaVerificacaoSegundos: timerVerificacao,
    ultimoErroFila: db.ultimoErroFila(),
  };
}
