// ============================================================================
// Camada de persistência (SQLite via better-sqlite3).
// Schema + queries para solicitações, histórico, fila, revisão, base oficial,
// configuração e auditoria. Também mantém o catálogo de processos (seed).
// ============================================================================
import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import type {
  Solicitacao,
  StatusSolicitacao,
  CorrecaoStatus,
  Setor,
  MensagemHistorico,
  FilaItem,
  StatusFilaItem,
  ContadoresFila,
  ItemRevisao,
  RegistroBase,
  Processo,
  DadosSolicitacao,
  LogAuditoria,
  DashboardMetrics,
  Relatorios,
} from "../shared/types";
import { PROCESSOS_PADRAO } from "./seed";

let db: Database.Database;

export function abrirBanco(userDataDir: string): Database.Database {
  const dataDir = join(userDataDir, "data");
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, "edugestao.sqlite");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  criarSchema();
  semearProcessos();
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Banco não inicializado. Chame abrirBanco() primeiro.");
  return db;
}

function criarSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS processos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      setor TEXT NOT NULL,
      descricao TEXT NOT NULL,
      slaDias INTEGER NOT NULL,
      etapas TEXT NOT NULL,
      respostasAutomaticas INTEGER NOT NULL,
      gatilhoAprovacao TEXT NOT NULL,
      disparosAutomaticos TEXT NOT NULL,
      palavrasChave TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS solicitacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo TEXT NOT NULL UNIQUE,
      assunto TEXT NOT NULL,
      setor TEXT NOT NULL,
      processoId TEXT,
      processoNome TEXT NOT NULL,
      status TEXT NOT NULL,
      correcaoStatus TEXT NOT NULL DEFAULT 'Pendente',
      pedidosCorrecao INTEGER NOT NULL DEFAULT 0,
      etapaAtual INTEGER NOT NULL DEFAULT 1,
      matricula TEXT,
      aluno TEXT,
      turma TEXT,
      unidade TEXT,
      municipio TEXT,
      emailResponsavel TEXT,
      pendencias TEXT NOT NULL DEFAULT '[]',
      emailOrigem TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mensagens_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacaoId INTEGER NOT NULL,
      remetente TEXT NOT NULL,
      de TEXT NOT NULL,
      para TEXT NOT NULL,
      assunto TEXT NOT NULL,
      corpo TEXT NOT NULL,
      anexos TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      filaId INTEGER,
      criadoEm TEXT NOT NULL,
      enviadoEm TEXT,
      FOREIGN KEY (solicitacaoId) REFERENCES solicitacoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fila (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacaoId INTEGER,
      protocolo TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      assunto TEXT NOT NULL,
      corpo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aguardando',
      tentativas INTEGER NOT NULL DEFAULT 0,
      maxTentativas INTEGER NOT NULL DEFAULT 3,
      erro TEXT,
      agendadoPara TEXT NOT NULL,
      criadoEm TEXT NOT NULL,
      processandoDesde TEXT,
      enviadoEm TEXT
    );

    CREATE TABLE IF NOT EXISTS revisao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacaoId INTEGER NOT NULL,
      protocolo TEXT NOT NULL,
      setor TEXT NOT NULL,
      processoNome TEXT NOT NULL,
      etapa TEXT NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      criadoEm TEXT NOT NULL,
      decididoEm TEXT,
      FOREIGN KEY (solicitacaoId) REFERENCES solicitacoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS base_oficial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT NOT NULL,
      nome TEXT NOT NULL,
      turma TEXT,
      unidade TEXT,
      municipio TEXT,
      emailResponsavel TEXT,
      tipo TEXT NOT NULL DEFAULT 'aluno',
      importadoEm TEXT NOT NULL,
      UNIQUE(matricula, tipo)
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT NOT NULL,
      protocolo TEXT,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emails_processados (
      messageId TEXT PRIMARY KEY,
      criadoEm TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sol_status ON solicitacoes(status);
    CREATE INDEX IF NOT EXISTS idx_sol_setor ON solicitacoes(setor);
    CREATE INDEX IF NOT EXISTS idx_hist_sol ON mensagens_historico(solicitacaoId);
    CREATE INDEX IF NOT EXISTS idx_fila_status ON fila(status);
    CREATE INDEX IF NOT EXISTS idx_base_matricula ON base_oficial(matricula);
  `);
}

function semearProcessos(): void {
  const count = (db.prepare("SELECT COUNT(*) c FROM processos").get() as { c: number }).c;
  if (count > 0) return;
  const stmt = db.prepare(`
    INSERT INTO processos
      (id, nome, setor, descricao, slaDias, etapas, respostasAutomaticas,
       gatilhoAprovacao, disparosAutomaticos, palavrasChave, ativo)
    VALUES (@id, @nome, @setor, @descricao, @slaDias, @etapas, @respostasAutomaticas,
       @gatilhoAprovacao, @disparosAutomaticos, @palavrasChave, @ativo)
  `);
  const tx = db.transaction((lista: Processo[]) => {
    for (const p of lista) {
      stmt.run({
        ...p,
        etapas: JSON.stringify(p.etapas),
        disparosAutomaticos: JSON.stringify(p.disparosAutomaticos),
        palavrasChave: JSON.stringify(p.palavrasChave),
        ativo: p.ativo ? 1 : 0,
      });
    }
  });
  tx(PROCESSOS_PADRAO);
}

// ------------------------------------------------------------------- Mappers
function mapSolicitacao(r: any): Solicitacao {
  return {
    id: r.id,
    protocolo: r.protocolo,
    assunto: r.assunto,
    setor: r.setor,
    processoId: r.processoId,
    processoNome: r.processoNome,
    status: r.status,
    correcaoStatus: r.correcaoStatus,
    pedidosCorrecao: r.pedidosCorrecao,
    etapaAtual: r.etapaAtual,
    dados: {
      matricula: r.matricula,
      aluno: r.aluno,
      turma: r.turma,
      unidade: r.unidade,
      municipio: r.municipio,
      emailResponsavel: r.emailResponsavel,
    },
    pendencias: JSON.parse(r.pendencias || "[]"),
    emailOrigem: r.emailOrigem,
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function mapProcesso(r: any): Processo {
  return {
    id: r.id,
    nome: r.nome,
    setor: r.setor,
    descricao: r.descricao,
    slaDias: r.slaDias,
    etapas: JSON.parse(r.etapas),
    respostasAutomaticas: r.respostasAutomaticas,
    gatilhoAprovacao: r.gatilhoAprovacao,
    disparosAutomaticos: JSON.parse(r.disparosAutomaticos),
    palavrasChave: JSON.parse(r.palavrasChave),
    ativo: !!r.ativo,
  };
}

function mapFila(r: any): FilaItem {
  return {
    id: r.id,
    solicitacaoId: r.solicitacaoId,
    protocolo: r.protocolo,
    destinatario: r.destinatario,
    assunto: r.assunto,
    corpo: r.corpo,
    status: r.status,
    tentativas: r.tentativas,
    maxTentativas: r.maxTentativas,
    erro: r.erro,
    agendadoPara: r.agendadoPara,
    criadoEm: r.criadoEm,
    processandoDesde: r.processandoDesde,
    enviadoEm: r.enviadoEm,
  };
}

// --------------------------------------------------------------- Processos
export function listarProcessos(setor?: string): Processo[] {
  const rows = setor
    ? db.prepare("SELECT * FROM processos WHERE setor = ? ORDER BY nome").all(setor)
    : db.prepare("SELECT * FROM processos ORDER BY setor, nome").all();
  return (rows as any[]).map(mapProcesso);
}

export function obterProcesso(id: string): Processo | null {
  const r = db.prepare("SELECT * FROM processos WHERE id = ?").get(id);
  return r ? mapProcesso(r) : null;
}

// --------------------------------------------------------------- Solicitações
export function listarSolicitacoes(filtro?: {
  status?: StatusSolicitacao;
  setor?: Setor;
}): Solicitacao[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filtro?.status) {
    clauses.push("status = ?");
    params.push(filtro.status);
  }
  if (filtro?.setor) {
    clauses.push("setor = ?");
    params.push(filtro.setor);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM solicitacoes ${where} ORDER BY atualizadoEm DESC`)
    .all(...params);
  return (rows as any[]).map(mapSolicitacao);
}

export function obterSolicitacao(id: number): Solicitacao | null {
  const r = db.prepare("SELECT * FROM solicitacoes WHERE id = ?").get(id);
  return r ? mapSolicitacao(r) : null;
}

export function obterSolicitacaoPorProtocolo(protocolo: string): Solicitacao | null {
  const r = db.prepare("SELECT * FROM solicitacoes WHERE protocolo = ?").get(protocolo);
  return r ? mapSolicitacao(r) : null;
}

export function criarSolicitacao(entrada: {
  protocolo: string;
  assunto: string;
  setor: Setor;
  processoId: string | null;
  processoNome: string;
  dados: DadosSolicitacao;
  pendencias: string[];
  emailOrigem: string;
}): Solicitacao {
  const agora = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO solicitacoes
        (protocolo, assunto, setor, processoId, processoNome, status,
         correcaoStatus, pedidosCorrecao, etapaAtual, matricula, aluno, turma,
         unidade, municipio, emailResponsavel, pendencias, emailOrigem,
         criadoEm, atualizadoEm)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      entrada.protocolo,
      entrada.assunto,
      entrada.setor,
      entrada.processoId,
      entrada.processoNome,
      "Nova",
      entrada.pendencias.length ? "Divergente" : "Pendente",
      0,
      1,
      entrada.dados.matricula,
      entrada.dados.aluno,
      entrada.dados.turma,
      entrada.dados.unidade,
      entrada.dados.municipio,
      entrada.dados.emailResponsavel,
      JSON.stringify(entrada.pendencias),
      entrada.emailOrigem,
      agora,
      agora
    );
  return obterSolicitacao(Number(info.lastInsertRowid))!;
}

export function atualizarStatusSolicitacao(id: number, status: StatusSolicitacao): void {
  db.prepare("UPDATE solicitacoes SET status = ?, atualizadoEm = ? WHERE id = ?").run(
    status,
    new Date().toISOString(),
    id
  );
}

export function atualizarDadosSolicitacao(
  id: number,
  dados: Partial<DadosSolicitacao>
): void {
  const atual = obterSolicitacao(id);
  if (!atual) return;
  const d = { ...atual.dados, ...dados };
  db.prepare(
    `UPDATE solicitacoes SET matricula=?, aluno=?, turma=?, unidade=?,
       municipio=?, emailResponsavel=?, atualizadoEm=? WHERE id=?`
  ).run(
    d.matricula,
    d.aluno,
    d.turma,
    d.unidade,
    d.municipio,
    d.emailResponsavel,
    new Date().toISOString(),
    id
  );
}

export function atualizarCorrecao(
  id: number,
  correcaoStatus: CorrecaoStatus,
  pendencias: string[]
): void {
  db.prepare(
    "UPDATE solicitacoes SET correcaoStatus=?, pendencias=?, atualizadoEm=? WHERE id=?"
  ).run(correcaoStatus, JSON.stringify(pendencias), new Date().toISOString(), id);
}

export function incrementarPedidoCorrecao(id: number): void {
  db.prepare(
    "UPDATE solicitacoes SET pedidosCorrecao = pedidosCorrecao + 1, status='Aguardando correção', correcaoStatus='Divergente', atualizadoEm=? WHERE id=?"
  ).run(new Date().toISOString(), id);
}

// --------------------------------------------------------------- Histórico
export function adicionarHistorico(msg: Omit<MensagemHistorico, "id">): number {
  const info = db
    .prepare(
      `INSERT INTO mensagens_historico
        (solicitacaoId, remetente, de, para, assunto, corpo, anexos, status,
         filaId, criadoEm, enviadoEm)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      msg.solicitacaoId,
      msg.remetente,
      msg.de,
      msg.para,
      msg.assunto,
      msg.corpo,
      JSON.stringify(msg.anexos),
      msg.status,
      msg.filaId,
      msg.criadoEm,
      msg.enviadoEm
    );
  return Number(info.lastInsertRowid);
}

export function obterHistorico(solicitacaoId: number): MensagemHistorico[] {
  const rows = db
    .prepare("SELECT * FROM mensagens_historico WHERE solicitacaoId = ? ORDER BY id ASC")
    .all(solicitacaoId);
  return (rows as any[]).map((r) => ({
    ...r,
    anexos: JSON.parse(r.anexos || "[]"),
  }));
}

export function atualizarStatusHistoricoPorFila(
  filaId: number,
  status: MensagemHistorico["status"],
  enviadoEm: string | null
): void {
  db.prepare(
    "UPDATE mensagens_historico SET status=?, enviadoEm=? WHERE filaId=?"
  ).run(status, enviadoEm, filaId);
}

// --------------------------------------------------------------- Fila
export function enfileirar(entrada: {
  solicitacaoId: number | null;
  protocolo: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  maxTentativas: number;
  agendadoPara: string;
}): number {
  const agora = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO fila
        (solicitacaoId, protocolo, destinatario, assunto, corpo, status,
         tentativas, maxTentativas, agendadoPara, criadoEm)
       VALUES (?,?,?,?,?, 'Aguardando', 0, ?, ?, ?)`
    )
    .run(
      entrada.solicitacaoId,
      entrada.protocolo,
      entrada.destinatario,
      entrada.assunto,
      entrada.corpo,
      entrada.maxTentativas,
      entrada.agendadoPara,
      agora
    );
  return Number(info.lastInsertRowid);
}

export function listarFila(): FilaItem[] {
  const rows = db.prepare("SELECT * FROM fila ORDER BY id DESC").all();
  return (rows as any[]).map(mapFila);
}

export function obterFilaItem(id: number): FilaItem | null {
  const r = db.prepare("SELECT * FROM fila WHERE id = ?").get(id);
  return r ? mapFila(r) : null;
}

/** Itens aguardando e cujo horário agendado já chegou, até `limite`. */
export function proximoLote(limite: number): FilaItem[] {
  const agora = new Date().toISOString();
  const rows = db
    .prepare(
      "SELECT * FROM fila WHERE status='Aguardando' AND agendadoPara <= ? ORDER BY id ASC LIMIT ?"
    )
    .all(agora, limite);
  return (rows as any[]).map(mapFila);
}

export function marcarProcessando(id: number): void {
  db.prepare(
    "UPDATE fila SET status='Processando', processandoDesde=? WHERE id=?"
  ).run(new Date().toISOString(), id);
}

export function marcarEnviado(id: number): void {
  db.prepare(
    "UPDATE fila SET status='Enviado', enviadoEm=?, erro=NULL WHERE id=?"
  ).run(new Date().toISOString(), id);
}

export function marcarFalha(id: number, erro: string, reagendarPara: string | null): void {
  if (reagendarPara) {
    // ainda há tentativas: volta para Aguardando reagendado
    db.prepare(
      "UPDATE fila SET status='Aguardando', tentativas=tentativas+1, erro=?, processandoDesde=NULL, agendadoPara=? WHERE id=?"
    ).run(erro, reagendarPara, id);
  } else {
    db.prepare(
      "UPDATE fila SET status='Com falha', tentativas=tentativas+1, erro=?, processandoDesde=NULL WHERE id=?"
    ).run(erro, id);
  }
}

export function cancelarFilaItem(id: number): void {
  db.prepare("UPDATE fila SET status='Cancelado' WHERE id=? AND status IN ('Aguardando','Com falha')").run(id);
}

export function reativarFilaItem(id: number, agendadoPara: string): void {
  db.prepare(
    "UPDATE fila SET status='Aguardando', erro=NULL, processandoDesde=NULL, agendadoPara=? WHERE id=?"
  ).run(agendadoPara, id);
}

/** Recupera itens travados em 'Processando' há mais de `segundos`. */
export function recuperarTravados(segundos: number): number {
  const limite = new Date(Date.now() - segundos * 1000).toISOString();
  const info = db
    .prepare(
      "UPDATE fila SET status='Aguardando', processandoDesde=NULL, erro='Recuperado: envio travado em processamento' WHERE status='Processando' AND processandoDesde < ?"
    )
    .run(limite);
  return info.changes;
}

export function contadoresFila(): ContadoresFila {
  const row = db
    .prepare(
      `SELECT
        SUM(status='Aguardando') aguardando,
        SUM(status='Processando') processando,
        SUM(status='Enviado') enviados,
        SUM(status='Com falha') comFalha
       FROM fila`
    )
    .get() as any;
  return {
    aguardando: row.aguardando || 0,
    processando: row.processando || 0,
    enviados: row.enviados || 0,
    comFalha: row.comFalha || 0,
  };
}

export function ultimoErroFila(): string | null {
  const r = db
    .prepare(
      "SELECT erro FROM fila WHERE status='Com falha' AND erro IS NOT NULL ORDER BY id DESC LIMIT 1"
    )
    .get() as any;
  return r?.erro ?? null;
}

/** Próximo item aguardando (para cronômetro "Encaminharemos em MM:SS"). */
export function proximoAgendamento(): string | null {
  const r = db
    .prepare(
      "SELECT agendadoPara FROM fila WHERE status='Aguardando' ORDER BY agendadoPara ASC LIMIT 1"
    )
    .get() as any;
  return r?.agendadoPara ?? null;
}

// --------------------------------------------------------------- Revisão
export function criarRevisao(entrada: Omit<ItemRevisao, "id" | "status" | "criadoEm" | "decididoEm">): number {
  const info = db
    .prepare(
      `INSERT INTO revisao
        (solicitacaoId, protocolo, setor, processoNome, etapa, descricao, status, criadoEm)
       VALUES (?,?,?,?,?,?, 'Pendente', ?)`
    )
    .run(
      entrada.solicitacaoId,
      entrada.protocolo,
      entrada.setor,
      entrada.processoNome,
      entrada.etapa,
      entrada.descricao,
      new Date().toISOString()
    );
  return Number(info.lastInsertRowid);
}

export function listarRevisao(): ItemRevisao[] {
  return db
    .prepare("SELECT * FROM revisao WHERE status='Pendente' ORDER BY criadoEm ASC")
    .all() as ItemRevisao[];
}

export function obterRevisao(id: number): ItemRevisao | null {
  return (db.prepare("SELECT * FROM revisao WHERE id = ?").get(id) as ItemRevisao) ?? null;
}

export function decidirRevisao(id: number, status: "Aprovado" | "Rejeitado"): void {
  db.prepare("UPDATE revisao SET status=?, decididoEm=? WHERE id=?").run(
    status,
    new Date().toISOString(),
    id
  );
}

// --------------------------------------------------------------- Base Oficial
export function listarBase(tipo?: "aluno" | "docente"): RegistroBase[] {
  const rows = tipo
    ? db.prepare("SELECT * FROM base_oficial WHERE tipo=? ORDER BY nome").all(tipo)
    : db.prepare("SELECT * FROM base_oficial ORDER BY tipo, nome").all();
  return rows as RegistroBase[];
}

export function buscarNaBasePorMatricula(matricula: string): RegistroBase | null {
  const r = db
    .prepare("SELECT * FROM base_oficial WHERE matricula = ? LIMIT 1")
    .get(matricula);
  return (r as RegistroBase) ?? null;
}

export function upsertBase(
  registros: Omit<RegistroBase, "id" | "importadoEm">[]
): { inseridos: number; atualizados: number } {
  const agora = new Date().toISOString();
  let inseridos = 0;
  let atualizados = 0;
  const existe = db.prepare("SELECT id FROM base_oficial WHERE matricula=? AND tipo=?");
  const ins = db.prepare(
    `INSERT INTO base_oficial (matricula, nome, turma, unidade, municipio, emailResponsavel, tipo, importadoEm)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const upd = db.prepare(
    `UPDATE base_oficial SET nome=?, turma=?, unidade=?, municipio=?, emailResponsavel=?, importadoEm=?
     WHERE matricula=? AND tipo=?`
  );
  const tx = db.transaction((lista: Omit<RegistroBase, "id" | "importadoEm">[]) => {
    for (const r of lista) {
      const row = existe.get(r.matricula, r.tipo) as { id: number } | undefined;
      if (row) {
        upd.run(r.nome, r.turma, r.unidade, r.municipio, r.emailResponsavel, agora, r.matricula, r.tipo);
        atualizados++;
      } else {
        ins.run(r.matricula, r.nome, r.turma, r.unidade, r.municipio, r.emailResponsavel, r.tipo, agora);
        inseridos++;
      }
    }
  });
  tx(registros);
  return { inseridos, atualizados };
}

// --------------------------------------------------------------- Auditoria
export function registrarAuditoria(entrada: Omit<LogAuditoria, "id" | "criadoEm">): void {
  db.prepare(
    "INSERT INTO auditoria (tipo, categoria, descricao, protocolo, criadoEm) VALUES (?,?,?,?,?)"
  ).run(entrada.tipo, entrada.categoria, entrada.descricao, entrada.protocolo, new Date().toISOString());
}

export function listarAuditoria(limite = 200): LogAuditoria[] {
  return db
    .prepare("SELECT * FROM auditoria ORDER BY id DESC LIMIT ?")
    .all(limite) as LogAuditoria[];
}

// --------------------------------------------------------------- Config (KV)
export function obterConfigRaw(chave: string): string | null {
  const r = db.prepare("SELECT valor FROM config WHERE chave=?").get(chave) as any;
  return r?.valor ?? null;
}

export function salvarConfigRaw(chave: string, valor: string): void {
  db.prepare(
    "INSERT INTO config (chave, valor) VALUES (?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor"
  ).run(chave, valor);
}

// --------------------------------------------------------------- E-mails processados
export function jaProcessado(messageId: string): boolean {
  if (!messageId) return false;
  return !!db.prepare("SELECT 1 FROM emails_processados WHERE messageId=?").get(messageId);
}

export function marcarEmailProcessado(messageId: string): void {
  if (!messageId) return;
  db.prepare(
    "INSERT OR IGNORE INTO emails_processados (messageId, criadoEm) VALUES (?,?)"
  ).run(messageId, new Date().toISOString());
}

// --------------------------------------------------------------- Dashboard / Relatórios
export function dashboard(): DashboardMetrics {
  const abertas = (db
    .prepare(
      "SELECT COUNT(*) c FROM solicitacoes WHERE status NOT IN ('Concluída','Arquivada')"
    )
    .get() as any).c;
  const aguardandoRevisao = (db
    .prepare("SELECT COUNT(*) c FROM revisao WHERE status='Pendente'")
    .get() as any).c;
  const emailsNaFila = (db
    .prepare("SELECT COUNT(*) c FROM fila WHERE status IN ('Aguardando','Processando')")
    .get() as any).c;
  const total = (db.prepare("SELECT COUNT(*) c FROM solicitacoes").get() as any).c;
  const concluidas = (db
    .prepare("SELECT COUNT(*) c FROM solicitacoes WHERE status='Concluída'")
    .get() as any).c;
  const taxa = total ? Math.round((concluidas / total) * 100) : 0;
  return {
    solicitacoesAbertas: abertas,
    aguardandoRevisao,
    emailsNaFila,
    taxaResolucao: taxa,
    totalSolicitacoes: total,
    concluidas,
  };
}

export function relatorios(): Relatorios {
  const porSetor = db
    .prepare(
      `SELECT setor,
        COUNT(*) total,
        SUM(status='Concluída') concluidas,
        SUM(status NOT IN ('Concluída','Arquivada')) emAndamento
       FROM solicitacoes GROUP BY setor ORDER BY setor`
    )
    .all() as any[];
  const porProcesso = db
    .prepare(
      `SELECT processoNome processo,
        COUNT(*) total,
        SUM(status='Concluída') concluidas
       FROM solicitacoes GROUP BY processoNome ORDER BY total DESC`
    )
    .all() as any[];
  return {
    porSetor: porSetor.map((r) => ({
      setor: r.setor,
      total: r.total,
      concluidas: r.concluidas || 0,
      emAndamento: r.emAndamento || 0,
    })),
    porProcesso: porProcesso.map((r) => ({
      processo: r.processo,
      total: r.total,
      concluidas: r.concluidas || 0,
    })),
  };
}
