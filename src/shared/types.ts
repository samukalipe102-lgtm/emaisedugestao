// ============================================================================
// Tipos compartilhados entre o processo principal (Electron) e o renderer (UI).
// Este arquivo é a "fonte da verdade" do contrato de dados e IPC.
// ============================================================================

// ---------------------------------------------------------------------------
// Setores / Fluxos
// ---------------------------------------------------------------------------
export type Setor =
  | "Secretaria Escolar"
  | "Coordenação Pedagógica"
  | "Administração"
  | "Direção Escolar";

export type StatusSolicitacao =
  | "Nova"
  | "Em análise"
  | "Aguardando correção"
  | "Aguardando aprovação"
  | "Concluída"
  | "Arquivada";

export type CorrecaoStatus = "Pendente" | "Validado" | "Divergente";

// ---------------------------------------------------------------------------
// Processos (catálogo de fluxos automáticos)
// ---------------------------------------------------------------------------
export interface EtapaFluxo {
  ordem: number;
  nome: string;
  descricao: string;
  requerAprovacao: boolean;
}

export interface Processo {
  id: string;
  nome: string;
  setor: Setor;
  descricao: string;
  slaDias: number;
  etapas: EtapaFluxo[];
  respostasAutomaticas: number;
  gatilhoAprovacao: string;
  disparosAutomaticos: string[];
  palavrasChave: string[];
  ativo: boolean;
}

// ---------------------------------------------------------------------------
// Base Oficial (alunos / docentes importados)
// ---------------------------------------------------------------------------
export interface RegistroBase {
  id: number;
  matricula: string; // identificador principal
  nome: string;
  turma: string | null;
  unidade: string | null;
  municipio: string | null;
  emailResponsavel: string | null;
  tipo: "aluno" | "docente";
  importadoEm: string;
}

// ---------------------------------------------------------------------------
// Solicitações (caixa de atendimento)
// ---------------------------------------------------------------------------
export interface DadosSolicitacao {
  matricula: string | null;
  aluno: string | null;
  turma: string | null;
  unidade: string | null;
  municipio: string | null;
  emailResponsavel: string | null;
}

export type RemetenteHistorico = "solicitante" | "sistema" | "equipe";

export interface MensagemHistorico {
  id: number;
  solicitacaoId: number;
  remetente: RemetenteHistorico;
  de: string;
  para: string;
  assunto: string;
  corpo: string;
  anexos: string[]; // nomes dos anexos
  status: "Recebido" | "Aguardando" | "Enviado" | "Com falha";
  filaId: number | null; // vínculo com item da fila de envio
  criadoEm: string;
  enviadoEm: string | null;
}

export interface Solicitacao {
  id: number;
  protocolo: string; // ex.: #C1EE754C
  assunto: string;
  setor: Setor;
  processoId: string | null;
  processoNome: string;
  status: StatusSolicitacao;
  correcaoStatus: CorrecaoStatus;
  pedidosCorrecao: number;
  etapaAtual: number;
  dados: DadosSolicitacao;
  pendencias: string[]; // divergências detectadas contra a Base Oficial
  emailOrigem: string;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------------------------------------------------------------------------
// Fila de envio
// ---------------------------------------------------------------------------
export type StatusFilaItem =
  | "Aguardando"
  | "Processando"
  | "Enviado"
  | "Com falha"
  | "Cancelado";

export interface FilaItem {
  id: number;
  solicitacaoId: number | null;
  protocolo: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  status: StatusFilaItem;
  tentativas: number;
  maxTentativas: number;
  erro: string | null;
  agendadoPara: string; // ISO — quando entra no lote
  criadoEm: string;
  processandoDesde: string | null;
  enviadoEm: string | null;
}

export interface ContadoresFila {
  aguardando: number;
  processando: number;
  enviados: number;
  comFalha: number;
}

// ---------------------------------------------------------------------------
// Revisão (aprovação humana)
// ---------------------------------------------------------------------------
export interface ItemRevisao {
  id: number;
  solicitacaoId: number;
  protocolo: string;
  setor: Setor;
  processoNome: string;
  etapa: string; // etapa crítica (ex.: "Efetivação de rematrícula")
  descricao: string;
  status: "Pendente" | "Aprovado" | "Rejeitado";
  criadoEm: string;
  decididoEm: string | null;
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
export interface ContaEmailConfig {
  provedor: "gmail-app-password" | "oauth2" | "imap-smtp";
  email: string;
  // App password (Gmail) / senha IMAP
  senhaApp: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  conectado: boolean;
}

export interface MonitoramentoConfig {
  intervaloMin: number; // intervalo da caixa de entrada
  horarioInicio: string; // "08:00"
  horarioFim: string; // "18:00"
  tentativasAposFalha: number;
  diasSemana: boolean[]; // [dom..sab] — 7 posições
  sincronizacaoAutomatica: boolean;
  funcionar24h: boolean; // ignora restrição de horário comercial
}

export interface FilaConfig {
  mensagensPorLote: number; // máx 10
  intervaloLoteMin: number; // mín 5
  tentativasPorMensagem: number;
  ativa: boolean; // Fila ativa / pausada
}

export interface OperadorConfig {
  nome: string;
  cargo: string;
}

export interface AppConfig {
  conta: ContaEmailConfig;
  monitoramento: MonitoramentoConfig;
  fila: FilaConfig;
  operador: OperadorConfig;
}

// ---------------------------------------------------------------------------
// Dashboard / status
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  solicitacoesAbertas: number;
  aguardandoRevisao: number;
  emailsNaFila: number;
  taxaResolucao: number; // %
  totalSolicitacoes: number;
  concluidas: number;
}

export interface StatusTempoReal {
  contaConectada: boolean;
  contaEmail: string;
  filaAtiva: boolean;
  monitoramentoAtivo: boolean;
  // Cronômetros regressivos (segundos restantes). null = inativo.
  proximoLoteSegundos: number | null;
  proximaVerificacaoSegundos: number | null;
  ultimoErroFila: string | null;
}

// ---------------------------------------------------------------------------
// Log de auditoria
// ---------------------------------------------------------------------------
export interface LogAuditoria {
  id: number;
  tipo: "automatico" | "humano";
  categoria: string;
  descricao: string;
  protocolo: string | null;
  criadoEm: string;
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
export interface RelatorioSetor {
  setor: string;
  total: number;
  concluidas: number;
  emAndamento: number;
}

export interface RelatorioProcesso {
  processo: string;
  total: number;
  concluidas: number;
}

export interface Relatorios {
  porSetor: RelatorioSetor[];
  porProcesso: RelatorioProcesso[];
}

// ---------------------------------------------------------------------------
// Resultados de operações de e-mail
// ---------------------------------------------------------------------------
export interface DiagnosticoEmail {
  imapOk: boolean;
  smtpOk: boolean;
  imapMensagem: string;
  smtpMensagem: string;
}

export interface VerificacaoResultado {
  novas: number;
  respostas: number;
  ignoradas: number;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Contrato IPC exposto no window.edu (preload)
// ---------------------------------------------------------------------------
export interface EduAPI {
  // Dashboard / status
  getDashboard(): Promise<DashboardMetrics>;
  getStatus(): Promise<StatusTempoReal>;

  // Solicitações
  listarSolicitacoes(filtro?: {
    status?: StatusSolicitacao;
    setor?: Setor;
  }): Promise<Solicitacao[]>;
  obterSolicitacao(id: number): Promise<Solicitacao | null>;
  obterHistorico(solicitacaoId: number): Promise<MensagemHistorico[]>;
  responderSolicitacao(
    solicitacaoId: number,
    corpo: string,
    assunto?: string
  ): Promise<{ ok: boolean; filaId: number }>;
  revalidarCorrecao(
    solicitacaoId: number
  ): Promise<{ ok: boolean; pendencias: string[]; status: CorrecaoStatus }>;
  atualizarDadosSolicitacao(
    solicitacaoId: number,
    dados: Partial<DadosSolicitacao>
  ): Promise<{ ok: boolean }>;
  arquivarSolicitacao(solicitacaoId: number): Promise<{ ok: boolean }>;

  // Processos
  listarProcessos(setor?: string): Promise<Processo[]>;
  modelosEmailProcesso(processoId: string): Promise<{ etapa: string; template: string }[]>;

  // Revisão
  listarRevisao(): Promise<ItemRevisao[]>;
  aprovarRevisao(id: number): Promise<{ ok: boolean; filaId: number | null }>;
  rejeitarRevisao(id: number, motivo: string): Promise<{ ok: boolean }>;

  // Fila
  listarFila(): Promise<FilaItem[]>;
  contadoresFila(): Promise<ContadoresFila>;
  reenviarItem(id: number): Promise<{ ok: boolean }>;
  cancelarItem(id: number): Promise<{ ok: boolean }>;
  processarFilaAgora(): Promise<{ enviados: number; falhas: number }>;

  // Base Oficial
  listarBase(tipo?: "aluno" | "docente"): Promise<RegistroBase[]>;
  importarBase(
    tipo: "aluno" | "docente",
    conteudo: string,
    nomeArquivo: string
  ): Promise<{ ok: boolean; inseridos: number; atualizados: number; erro?: string }>;

  // Config
  obterConfig(): Promise<AppConfig>;
  salvarConta(conta: ContaEmailConfig): Promise<{ ok: boolean }>;
  salvarMonitoramento(m: MonitoramentoConfig): Promise<{ ok: boolean }>;
  salvarFilaConfig(f: FilaConfig): Promise<{ ok: boolean }>;
  salvarOperador(o: OperadorConfig): Promise<{ ok: boolean }>;
  testarRecebimento(): Promise<DiagnosticoEmail>;
  verificarCaixaAgora(): Promise<VerificacaoResultado>;

  // Relatórios / auditoria
  obterRelatorios(): Promise<Relatorios>;
  listarAuditoria(limite?: number): Promise<LogAuditoria[]>;

  // Eventos em tempo real (push do main -> renderer)
  onAtualizacao(cb: () => void): () => void;
}

declare global {
  interface Window {
    edu: EduAPI;
  }
}
