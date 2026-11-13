import React from "react";
import type { AppConfig, StatusTempoReal } from "@shared/types";
import {
  IconPainel, IconSolicitacoes, IconProcessos, IconRevisao,
  IconBase, IconRelatorios, IconConfig, IconMail,
} from "./icons";

export type Rota =
  | "painel" | "solicitacoes" | "processos" | "revisao"
  | "base" | "fila" | "relatorios" | "config";

interface Props {
  rota: Rota;
  onNavegar: (r: Rota) => void;
  badges: { solicitacoes: number; revisao: number };
  status: StatusTempoReal | null;
  config: AppConfig | null;
}

const ITENS: { rota: Rota; label: string; Icon: React.FC<{ className?: string }>; badgeKey?: "solicitacoes" | "revisao" }[] = [
  { rota: "painel", label: "Painel", Icon: IconPainel },
  { rota: "solicitacoes", label: "Solicitações", Icon: IconSolicitacoes, badgeKey: "solicitacoes" },
  { rota: "processos", label: "Processos", Icon: IconProcessos },
  { rota: "revisao", label: "Revisão", Icon: IconRevisao, badgeKey: "revisao" },
  { rota: "base", label: "Base Oficial", Icon: IconBase },
  { rota: "fila", label: "Fila de envio", Icon: IconMail },
  { rota: "relatorios", label: "Relatórios", Icon: IconRelatorios },
  { rota: "config", label: "Configurações", Icon: IconConfig },
];

export function Sidebar({ rota, onNavegar, badges, status, config }: Props) {
  const conectado = status?.contaConectada;
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink-900 text-white">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal font-extrabold">E</div>
        <div className="leading-tight">
          <div className="text-sm font-bold">EduGestão</div>
          <div className="text-[11px] text-ink-400">Central de Atendimento</div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-3">
        {ITENS.map(({ rota: r, label, Icon, badgeKey }) => {
          const ativo = rota === r;
          const n = badgeKey ? badges[badgeKey] : 0;
          return (
            <button
              key={r}
              onClick={() => onNavegar(r)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                ativo ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badgeKey && n > 0 && (
                <span className="rounded-full bg-royal px-2 py-0.5 text-[11px] font-bold text-white">{n}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé: conta institucional + operador */}
      <div className="space-y-2 p-3">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${conectado ? "bg-emerald" : "bg-danger"}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {conectado ? "Conta conectada" : "Conta offline"}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-white" title={status?.contaEmail}>
            {status?.contaEmail || "Nenhuma conta configurada"}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-xs font-semibold text-white">{config?.operador.nome ?? "Operador"}</div>
          <div className="text-[11px] text-ink-400">{config?.operador.cargo ?? "Atendimento Escolar"}</div>
        </div>
      </div>
    </aside>
  );
}
