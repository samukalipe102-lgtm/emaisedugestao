// ============================================================================
// Configuração da aplicação. Persistida em userData/config.json (fora do
// binário e do git — contém a App Password da conta institucional).
// A config de monitoramento/fila também é espelhada no SQLite para consultas,
// mas o config.json é a fonte da verdade para credenciais.
// ============================================================================
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type {
  AppConfig,
  ContaEmailConfig,
  MonitoramentoConfig,
  FilaConfig,
  OperadorConfig,
} from "../shared/types";

let caminho: string;
let cache: AppConfig;

export const CONFIG_PADRAO: AppConfig = {
  conta: {
    provedor: "gmail-app-password",
    email: "",
    senhaApp: "",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
    conectado: false,
  },
  monitoramento: {
    intervaloMin: 5,
    horarioInicio: "08:00",
    horarioFim: "18:00",
    tentativasAposFalha: 3,
    // [dom, seg, ter, qua, qui, sex, sab] — dias úteis por padrão
    diasSemana: [false, true, true, true, true, true, false],
    sincronizacaoAutomatica: true,
    funcionar24h: false,
  },
  fila: {
    mensagensPorLote: 10,
    intervaloLoteMin: 5,
    tentativasPorMensagem: 3,
    ativa: true,
  },
  operador: {
    nome: "Operador",
    cargo: "Atendimento Escolar",
  },
};

function mergeDeep(base: any, over: any): any {
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    if (
      over[k] &&
      typeof over[k] === "object" &&
      !Array.isArray(over[k]) &&
      typeof base[k] === "object"
    ) {
      out[k] = mergeDeep(base[k], over[k]);
    } else if (over[k] !== undefined) {
      out[k] = over[k];
    }
  }
  return out;
}

export function carregarConfig(userDataDir: string): AppConfig {
  caminho = join(userDataDir, "config.json");
  if (existsSync(caminho)) {
    try {
      const raw = JSON.parse(readFileSync(caminho, "utf-8"));
      cache = mergeDeep(CONFIG_PADRAO, raw);
    } catch {
      cache = structuredClone(CONFIG_PADRAO);
    }
  } else {
    cache = structuredClone(CONFIG_PADRAO);
    persistir();
  }
  return cache;
}

function persistir(): void {
  writeFileSync(caminho, JSON.stringify(cache, null, 2), "utf-8");
}

export function obterConfig(): AppConfig {
  return cache;
}

export function salvarConta(conta: ContaEmailConfig): void {
  cache.conta = { ...cache.conta, ...conta };
  persistir();
}

export function salvarMonitoramento(m: MonitoramentoConfig): void {
  cache.monitoramento = { ...cache.monitoramento, ...m };
  persistir();
}

export function salvarFilaConfig(f: FilaConfig): void {
  cache.fila = { ...cache.fila, ...f };
  persistir();
}

export function salvarOperador(o: OperadorConfig): void {
  cache.operador = { ...cache.operador, ...o };
  persistir();
}

export function definirConectado(conectado: boolean): void {
  cache.conta.conectado = conectado;
  persistir();
}

/** Verifica se o horário atual está dentro da janela de operação. */
export function dentroDoHorario(agora = new Date()): boolean {
  const m = cache.monitoramento;
  if (m.funcionar24h) return true;
  const dia = agora.getDay(); // 0=dom..6=sab
  if (!m.diasSemana[dia]) return false;
  const [hi, mi] = m.horarioInicio.split(":").map(Number);
  const [hf, mf] = m.horarioFim.split(":").map(Number);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const inicio = hi * 60 + mi;
  const fim = hf * 60 + mf;
  return minutosAgora >= inicio && minutosAgora <= fim;
}
