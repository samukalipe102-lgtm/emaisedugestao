// ============================================================================
// Processo principal do Electron: ciclo de vida do app, janela, bandeja do
// sistema (minimizar para a bandeja mantendo o motor de e-mail rodando) e
// o registro de TODOS os handlers IPC que compõem o contrato EduAPI.
// ============================================================================
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from "electron";
import { join } from "node:path";
import * as db from "./db";
import * as cfg from "./config";
import * as engine from "./engine";
import * as email from "./email";
import { modelosDoProcesso, confirmacaoAprovacao } from "./templates";
import type {
  StatusSolicitacao,
  Setor,
  ContaEmailConfig,
  MonitoramentoConfig,
  FilaConfig,
  OperadorConfig,
  DadosSolicitacao,
} from "../shared/types";

// esbuild emite este arquivo como CommonJS, então __dirname já é o diretório
// do bundle (dist-electron/main). Os caminhos relativos abaixo partem dele.
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let saindo = false;

// --------------------------------------------------- Janela principal
function criarJanela(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#F8FAFC",
    title: "EduGestão — Central de Atendimento Escolar",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../../dist-renderer/index.html"));
  }

  // Fechar janela -> minimiza para a bandeja (motor continua em segundo plano)
  mainWindow.on("close", (e) => {
    if (!saindo) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// --------------------------------------------------- Bandeja do sistema
function criarBandeja(): void {
  // ícone simples embutido (16x16 azul) — evita depender de asset externo
  const icon = nativeImage.createFromDataURL(ICON_DATA_URL);
  tray = new Tray(icon);
  tray.setToolTip("EduGestão — Central de Atendimento");
  const menu = Menu.buildFromTemplate([
    { label: "Abrir central", click: () => mostrarJanela() },
    {
      label: "Verificar caixa agora",
      click: async () => {
        await engine.verificarCaixa();
      },
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        saindo = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("double-click", () => mostrarJanela());
}

function mostrarJanela(): void {
  if (!mainWindow) criarJanela();
  mainWindow?.show();
  mainWindow?.focus();
}

function notificarRenderer(): void {
  mainWindow?.webContents.send("edu:atualizacao");
}

// --------------------------------------------------- IPC handlers (EduAPI)
function registrarIPC(): void {
  // Dashboard / status
  ipcMain.handle("getDashboard", () => db.dashboard());
  ipcMain.handle("getStatus", () => engine.status());

  // Solicitações
  ipcMain.handle("listarSolicitacoes", (_e, filtro) => db.listarSolicitacoes(filtro));
  ipcMain.handle("obterSolicitacao", (_e, id: number) => db.obterSolicitacao(id));
  ipcMain.handle("obterHistorico", (_e, id: number) => db.obterHistorico(id));

  ipcMain.handle("responderSolicitacao", (_e, id: number, corpo: string, assunto?: string) => {
    const sol = db.obterSolicitacao(id);
    if (!sol) return { ok: false, filaId: -1 };
    const destinatario = sol.dados.emailResponsavel || sol.emailOrigem;
    const assuntoFinal = assunto || `Re: ${sol.assunto}`;
    const conf = cfg.obterConfig();
    const filaId = db.enfileirar({
      solicitacaoId: sol.id,
      protocolo: sol.protocolo,
      destinatario,
      assunto: assuntoFinal,
      corpo,
      maxTentativas: conf.fila.tentativasPorMensagem,
      agendadoPara: new Date().toISOString(),
    });
    db.adicionarHistorico({
      solicitacaoId: sol.id,
      remetente: "equipe",
      de: conf.conta.email,
      para: destinatario,
      assunto: assuntoFinal,
      corpo,
      anexos: [],
      status: "Aguardando",
      filaId,
      criadoEm: new Date().toISOString(),
      enviadoEm: null,
    });
    db.registrarAuditoria({
      tipo: "humano",
      categoria: "Resposta manual",
      descricao: `Operador respondeu ${destinatario} (via fila).`,
      protocolo: sol.protocolo,
    });
    notificarRenderer();
    return { ok: true, filaId };
  });

  ipcMain.handle("revalidarCorrecao", (_e, id: number) => {
    const sol = db.obterSolicitacao(id);
    if (!sol) return { ok: false, pendencias: [], status: "Pendente" as const };
    const pendencias: string[] = [];
    if (!sol.dados.matricula) {
      pendencias.push("Matrícula não informada (identificador principal obrigatório).");
    } else {
      const base = db.buscarNaBasePorMatricula(sol.dados.matricula);
      if (!base) pendencias.push(`Matrícula ${sol.dados.matricula} não encontrada na Base Oficial.`);
      else {
        const cmp = (campo: string, inf: string | null, of: string | null) => {
          if (inf && of && inf.trim().toLowerCase() !== of.trim().toLowerCase())
            pendencias.push(`${campo}: informado "${inf}" diverge da Base Oficial "${of}".`);
        };
        cmp("Aluno", sol.dados.aluno, base.nome);
        cmp("Turma", sol.dados.turma, base.turma);
        cmp("Unidade escolar", sol.dados.unidade, base.unidade);
        cmp("Município", sol.dados.municipio, base.municipio);
        cmp("E-mail do responsável", sol.dados.emailResponsavel, base.emailResponsavel);
      }
    }
    const status = pendencias.length ? "Divergente" : "Validado";
    db.atualizarCorrecao(id, status, pendencias);
    db.atualizarStatusSolicitacao(id, status === "Validado" ? "Em análise" : "Aguardando correção");
    notificarRenderer();
    return { ok: true, pendencias, status };
  });

  ipcMain.handle("atualizarDadosSolicitacao", (_e, id: number, dados: Partial<DadosSolicitacao>) => {
    db.atualizarDadosSolicitacao(id, dados);
    notificarRenderer();
    return { ok: true };
  });

  ipcMain.handle("arquivarSolicitacao", (_e, id: number) => {
    db.atualizarStatusSolicitacao(id, "Arquivada");
    const sol = db.obterSolicitacao(id);
    db.registrarAuditoria({
      tipo: "humano",
      categoria: "Arquivamento",
      descricao: `Solicitação arquivada.`,
      protocolo: sol?.protocolo ?? null,
    });
    notificarRenderer();
    return { ok: true };
  });

  // Processos
  ipcMain.handle("listarProcessos", (_e, setor?: string) => db.listarProcessos(setor));
  ipcMain.handle("modelosEmailProcesso", (_e, processoId: string) => {
    const p = db.obterProcesso(processoId);
    return p ? modelosDoProcesso(p) : [];
  });

  // Revisão
  ipcMain.handle("listarRevisao", () => db.listarRevisao());
  ipcMain.handle("aprovarRevisao", (_e, id: number) => {
    const item = db.obterRevisao(id);
    if (!item) return { ok: false, filaId: null };
    db.decidirRevisao(id, "Aprovado");
    const sol = db.obterSolicitacao(item.solicitacaoId);
    let filaId: number | null = null;
    if (sol) {
      db.atualizarStatusSolicitacao(sol.id, "Concluída");
      const destinatario = sol.dados.emailResponsavel || sol.emailOrigem;
      const conf = cfg.obterConfig();
      filaId = db.enfileirar({
        solicitacaoId: sol.id,
        protocolo: sol.protocolo,
        destinatario,
        assunto: `Solicitação concluída`,
        corpo: confirmacaoAprovacao(sol),
        maxTentativas: conf.fila.tentativasPorMensagem,
        agendadoPara: new Date().toISOString(),
      });
      db.adicionarHistorico({
        solicitacaoId: sol.id,
        remetente: "sistema",
        de: conf.conta.email,
        para: destinatario,
        assunto: `Solicitação concluída`,
        corpo: confirmacaoAprovacao(sol),
        anexos: [],
        status: "Aguardando",
        filaId,
        criadoEm: new Date().toISOString(),
        enviadoEm: null,
      });
    }
    db.registrarAuditoria({
      tipo: "humano",
      categoria: "Aprovação",
      descricao: `Etapa "${item.etapa}" aprovada.`,
      protocolo: item.protocolo,
    });
    notificarRenderer();
    return { ok: true, filaId };
  });
  ipcMain.handle("rejeitarRevisao", (_e, id: number, motivo: string) => {
    const item = db.obterRevisao(id);
    db.decidirRevisao(id, "Rejeitado");
    if (item) {
      db.atualizarStatusSolicitacao(item.solicitacaoId, "Aguardando correção");
      db.registrarAuditoria({
        tipo: "humano",
        categoria: "Rejeição",
        descricao: `Etapa "${item.etapa}" rejeitada: ${motivo}`,
        protocolo: item.protocolo,
      });
    }
    notificarRenderer();
    return { ok: true };
  });

  // Fila
  ipcMain.handle("listarFila", () => db.listarFila());
  ipcMain.handle("contadoresFila", () => db.contadoresFila());
  ipcMain.handle("reenviarItem", (_e, id: number) => {
    db.reativarFilaItem(id, new Date().toISOString());
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("cancelarItem", (_e, id: number) => {
    db.cancelarFilaItem(id);
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("processarFilaAgora", async () => {
    const r = await engine.processarFila();
    notificarRenderer();
    return r;
  });

  // Base Oficial
  ipcMain.handle("listarBase", (_e, tipo?: "aluno" | "docente") => db.listarBase(tipo));
  ipcMain.handle("importarBase", (_e, tipo: "aluno" | "docente", conteudo: string, nomeArquivo: string) => {
    try {
      const registros = parseCsv(conteudo, tipo);
      if (!registros.length) {
        return { ok: false, inseridos: 0, atualizados: 0, erro: "Nenhum registro válido encontrado. Verifique o cabeçalho (matricula, nome, turma, unidade, municipio, emailResponsavel)." };
      }
      const r = db.upsertBase(registros);
      db.registrarAuditoria({
        tipo: "humano",
        categoria: "Importação Base Oficial",
        descricao: `Importado "${nomeArquivo}": ${r.inseridos} inseridos, ${r.atualizados} atualizados.`,
        protocolo: null,
      });
      notificarRenderer();
      return { ok: true, ...r };
    } catch (e: any) {
      return { ok: false, inseridos: 0, atualizados: 0, erro: e?.message ?? String(e) };
    }
  });

  // Config
  ipcMain.handle("obterConfig", () => cfg.obterConfig());
  ipcMain.handle("salvarConta", (_e, conta: ContaEmailConfig) => {
    cfg.salvarConta(conta);
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("salvarMonitoramento", (_e, m: MonitoramentoConfig) => {
    cfg.salvarMonitoramento(m);
    engine.sincronizarCronometros();
    db.registrarAuditoria({
      tipo: "humano",
      categoria: "Configuração",
      descricao: "Monitoramento atualizado.",
      protocolo: null,
    });
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("salvarFilaConfig", (_e, f: FilaConfig) => {
    cfg.salvarFilaConfig(f);
    engine.sincronizarCronometros();
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("salvarOperador", (_e, o: OperadorConfig) => {
    cfg.salvarOperador(o);
    notificarRenderer();
    return { ok: true };
  });
  ipcMain.handle("testarRecebimento", async () => {
    const d = await email.testarRecebimento(cfg.obterConfig().conta);
    cfg.definirConectado(d.imapOk && d.smtpOk);
    notificarRenderer();
    return d;
  });
  ipcMain.handle("verificarCaixaAgora", async () => {
    const r = await engine.verificarCaixa();
    notificarRenderer();
    return r;
  });

  // Relatórios / auditoria
  ipcMain.handle("obterRelatorios", () => db.relatorios());
  ipcMain.handle("listarAuditoria", (_e, limite?: number) => db.listarAuditoria(limite));
}

// --------------------------------------------------- Parsing CSV (Base Oficial)
function parseCsv(conteudo: string, tipo: "aluno" | "docente"): Omit<import("../shared/types").RegistroBase, "id" | "importadoEm">[] {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];
  const sep = linhas[0].includes(";") ? ";" : ",";
  const header = linhas[0].split(sep).map((h) => normalizar(h));
  const idx = (chaves: string[]) => header.findIndex((h) => chaves.includes(h));
  const iMat = idx(["matricula", "matrícula", "ra", "registro"]);
  const iNome = idx(["nome", "aluno", "estudante", "docente", "professor"]);
  const iTurma = idx(["turma", "serie", "série", "ano"]);
  const iUnid = idx(["unidade", "unidadeescolar", "escola"]);
  const iMun = idx(["municipio", "município", "cidade"]);
  const iEmail = idx(["emailresponsavel", "emaildoresponsavel", "email", "e-mail", "responsavel"]);
  const registros: any[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(sep);
    const matricula = (iMat >= 0 ? cols[iMat] : "")?.trim();
    const nome = (iNome >= 0 ? cols[iNome] : "")?.trim();
    if (!matricula || !nome) continue; // sem identificador principal não entra
    registros.push({
      matricula,
      nome,
      turma: iTurma >= 0 ? cols[iTurma]?.trim() || null : null,
      unidade: iUnid >= 0 ? cols[iUnid]?.trim() || null : null,
      municipio: iMun >= 0 ? cols[iMun]?.trim() || null : null,
      emailResponsavel: iEmail >= 0 ? cols[iEmail]?.trim() || null : null,
      tipo,
    });
  }
  return registros;
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

// --------------------------------------------------- Ciclo de vida
const unicaInstancia = app.requestSingleInstanceLock();
if (!unicaInstancia) {
  app.quit();
} else {
  app.on("second-instance", () => mostrarJanela());

  app.whenReady().then(() => {
    const userData = app.getPath("userData");
    db.abrirBanco(userData);
    cfg.carregarConfig(userData);
    engine.registrarEmissor(notificarRenderer);
    registrarIPC();
    criarJanela();
    criarBandeja();
    engine.iniciarCronometros();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela();
      else mostrarJanela();
    });
  });

  // Não encerra ao fechar janelas — vive na bandeja.
  app.on("window-all-closed", () => {
    // mantém em segundo plano (motor de e-mail). Só sai via bandeja -> Sair.
  });

  app.on("before-quit", () => {
    saindo = true;
  });
}

// Ícone de bandeja embutido (PNG 16x16, "E" em fundo azul institucional).
const ICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAiElEQVR4nGNgGAWjYBSMglEwCkYBFvD//38GBgYGhv///zPgwkzYFGMzAJsBTLgMwGYAE7IBuAzAaQA2A3AZgNMAbAbgMgCnAdgMwGUATgOwGYDLAJwGYDMAlwE4DcBmAC4DcBqAzQBcBuA0AJsBuAzAaQA2A3AZgNMAbAbgMgCnAQCk5h8Z+ZzN0wAAAABJRU5ErkJggg==";
