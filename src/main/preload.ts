// ============================================================================
// Preload: expõe o contrato EduAPI em window.edu via contextBridge, mantendo
// contextIsolation. Cada método encaminha para um handler ipcMain.handle.
// ============================================================================
import { contextBridge, ipcRenderer } from "electron";
import type { EduAPI } from "../shared/types";

const api: EduAPI = {
  getDashboard: () => ipcRenderer.invoke("getDashboard"),
  getStatus: () => ipcRenderer.invoke("getStatus"),

  listarSolicitacoes: (filtro) => ipcRenderer.invoke("listarSolicitacoes", filtro),
  obterSolicitacao: (id) => ipcRenderer.invoke("obterSolicitacao", id),
  obterHistorico: (id) => ipcRenderer.invoke("obterHistorico", id),
  responderSolicitacao: (id, corpo, assunto) =>
    ipcRenderer.invoke("responderSolicitacao", id, corpo, assunto),
  revalidarCorrecao: (id) => ipcRenderer.invoke("revalidarCorrecao", id),
  atualizarDadosSolicitacao: (id, dados) =>
    ipcRenderer.invoke("atualizarDadosSolicitacao", id, dados),
  arquivarSolicitacao: (id) => ipcRenderer.invoke("arquivarSolicitacao", id),

  listarProcessos: (setor) => ipcRenderer.invoke("listarProcessos", setor),
  modelosEmailProcesso: (processoId) => ipcRenderer.invoke("modelosEmailProcesso", processoId),

  listarRevisao: () => ipcRenderer.invoke("listarRevisao"),
  aprovarRevisao: (id) => ipcRenderer.invoke("aprovarRevisao", id),
  rejeitarRevisao: (id, motivo) => ipcRenderer.invoke("rejeitarRevisao", id, motivo),

  listarFila: () => ipcRenderer.invoke("listarFila"),
  contadoresFila: () => ipcRenderer.invoke("contadoresFila"),
  reenviarItem: (id) => ipcRenderer.invoke("reenviarItem", id),
  cancelarItem: (id) => ipcRenderer.invoke("cancelarItem", id),
  processarFilaAgora: () => ipcRenderer.invoke("processarFilaAgora"),

  listarBase: (tipo) => ipcRenderer.invoke("listarBase", tipo),
  importarBase: (tipo, conteudo, nomeArquivo) =>
    ipcRenderer.invoke("importarBase", tipo, conteudo, nomeArquivo),

  obterConfig: () => ipcRenderer.invoke("obterConfig"),
  salvarConta: (conta) => ipcRenderer.invoke("salvarConta", conta),
  salvarMonitoramento: (m) => ipcRenderer.invoke("salvarMonitoramento", m),
  salvarFilaConfig: (f) => ipcRenderer.invoke("salvarFilaConfig", f),
  salvarOperador: (o) => ipcRenderer.invoke("salvarOperador", o),
  testarRecebimento: () => ipcRenderer.invoke("testarRecebimento"),
  verificarCaixaAgora: () => ipcRenderer.invoke("verificarCaixaAgora"),

  obterRelatorios: () => ipcRenderer.invoke("obterRelatorios"),
  listarAuditoria: (limite) => ipcRenderer.invoke("listarAuditoria", limite),

  onAtualizacao: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("edu:atualizacao", listener);
    return () => ipcRenderer.removeListener("edu:atualizacao", listener);
  },
};

contextBridge.exposeInMainWorld("edu", api);
