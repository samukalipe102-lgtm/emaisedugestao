import React, { useEffect, useState } from "react";
import type { DashboardMetrics, StatusTempoReal } from "@shared/types";
import { useCountdown, formatarMMSS } from "../lib/ui";
import { IconMail, IconClock, IconSolicitacoes, IconRevisao } from "../components/icons";

interface Props {
  status: StatusTempoReal | null;
}

function Indicador({ titulo, valor, sufixo, Icon, tom }: {
  titulo: string; valor: number | string; sufixo?: string;
  Icon: React.FC<{ className?: string }>; tom: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{titulo}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tom}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold text-ink-900">
        {valor}
        {sufixo && <span className="ml-1 text-lg font-semibold text-ink-400">{sufixo}</span>}
      </div>
    </div>
  );
}

export function Painel({ status }: Props) {
  const [m, setM] = useState<DashboardMetrics | null>(null);
  const verif = useCountdown(status?.proximaVerificacaoSegundos ?? null);
  const lote = useCountdown(status?.proximoLoteSegundos ?? null);

  const carregar = () => window.edu.getDashboard().then(setM);
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Painel</h1>
        <p className="text-sm text-ink-500">
          Visão geral da central — todo o atendimento acontece exclusivamente por e-mail.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Solicitações abertas" valor={m?.solicitacoesAbertas ?? 0} Icon={IconSolicitacoes} tom="bg-blue-50 text-navy" />
        <Indicador titulo="Aguardando revisão humana" valor={m?.aguardandoRevisao ?? 0} Icon={IconRevisao} tom="bg-amber-soft text-amber-ink" />
        <Indicador titulo="E-mails na fila" valor={m?.emailsNaFila ?? 0} Icon={IconMail} tom="bg-slate-100 text-ink-600" />
        <Indicador titulo="Taxa de resolução" valor={m?.taxaResolucao ?? 0} sufixo="%" Icon={IconCheckMini} tom="bg-emerald-soft text-emerald-ink" />
      </div>

      {/* Status em tempo real */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-ink-700">
            <IconClock className="h-5 w-5 text-royal" />
            <span className="font-semibold">Verificando caixa de entrada em</span>
          </div>
          <div className="mt-2 font-mono text-4xl font-extrabold tabular-nums text-ink-900">
            {status?.monitoramentoAtivo ? formatarMMSS(verif) : "Pausado"}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {status?.monitoramentoAtivo
              ? "A leitura automática criará solicitações a partir de novos e-mails."
              : "Monitoramento fora do horário ou sincronização desativada."}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-ink-700">
            <IconMail className="h-5 w-5 text-royal" />
            <span className="font-semibold">Encaminharemos o próximo lote em</span>
          </div>
          <div className="mt-2 font-mono text-4xl font-extrabold tabular-nums text-ink-900">
            {status?.filaAtiva ? formatarMMSS(lote) : "Fila pausada"}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {status?.ultimoErroFila ? (
              <span className="text-danger-ink">Último erro: {status.ultimoErroFila}</span>
            ) : (
              "Os envios seguem em lotes automáticos pela fila."
            )}
          </p>
        </div>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <span className={`h-2.5 w-2.5 rounded-full ${status?.contaConectada ? "bg-emerald" : "bg-danger"}`} />
        <span className="text-sm font-semibold text-ink-700">
          {status?.contaConectada ? "Conta institucional conectada" : "Conta institucional offline"}
        </span>
        <span className="text-sm text-ink-400">·</span>
        <span className="text-sm text-ink-500">{status?.contaEmail || "configure em Configurações"}</span>
      </div>
    </div>
  );
}

const IconCheckMini: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
