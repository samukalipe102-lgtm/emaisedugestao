import React, { useEffect, useState } from "react";
import type { FilaItem, ContadoresFila, StatusTempoReal } from "@shared/types";
import { useCountdown, formatarMMSS, formatarData, badgeClass, toneFila } from "../lib/ui";
import { IconMail, IconRefresh, IconClock } from "../components/icons";

export function Fila({ status, onMudou }: { status: StatusTempoReal | null; onMudou: () => void }) {
  const [itens, setItens] = useState<FilaItem[]>([]);
  const [cont, setCont] = useState<ContadoresFila | null>(null);
  const [processando, setProcessando] = useState(false);
  const lote = useCountdown(status?.proximoLoteSegundos ?? null);

  const carregar = () => {
    window.edu.listarFila().then(setItens);
    window.edu.contadoresFila().then(setCont);
  };
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 3000);
    return () => clearInterval(id);
  }, []);

  const processarAgora = async () => {
    setProcessando(true);
    await window.edu.processarFilaAgora();
    carregar();
    onMudou();
    setProcessando(false);
  };
  const reenviar = async (id: number) => { await window.edu.reenviarItem(id); carregar(); onMudou(); };
  const cancelar = async (id: number) => { await window.edu.cancelarItem(id); carregar(); onMudou(); };

  const C = ({ titulo, valor, tom }: { titulo: string; valor: number; tom: string }) => (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{titulo}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tom}`}>{valor}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Fila de envio</h1>
          <p className="text-sm text-ink-500">Processamento em lote com cronômetro regressivo e trilha de auditoria.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${status?.filaAtiva ? "bg-emerald-soft text-emerald-ink" : "bg-slate-100 text-ink-600"}`}>
            <span className={`h-2 w-2 rounded-full ${status?.filaAtiva ? "bg-emerald" : "bg-ink-400"}`} /> {status?.filaAtiva ? "Fila ativa" : "Fila pausada"}
          </span>
          <button onClick={processarAgora} disabled={processando} className="btn-primary">
            <IconMail className="h-4 w-4" /> {processando ? "Enviando…" : "Processar fila agora"}
          </button>
        </div>
      </div>

      {status?.ultimoErroFila && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger-ink">
          <strong>Último erro de envio:</strong> {status.ultimoErroFila}
        </div>
      )}

      <div className="card flex items-center gap-3 p-4">
        <IconClock className="h-5 w-5 text-royal" />
        <span className="font-semibold text-ink-700">Encaminharemos o próximo lote em</span>
        <span className="font-mono text-2xl font-extrabold tabular-nums text-ink-900">
          {status?.filaAtiva ? formatarMMSS(lote) : "Fila pausada"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <C titulo="Aguardando" valor={cont?.aguardando ?? 0} tom="text-amber-ink" />
        <C titulo="Processando" valor={cont?.processando ?? 0} tom="text-navy" />
        <C titulo="Enviados" valor={cont?.enviados ?? 0} tom="text-emerald-ink" />
        <C titulo="Com falha" valor={cont?.comFalha ?? 0} tom="text-danger-ink" />
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Destinatário</th>
              <th className="px-4 py-3">Assunto</th>
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tentativas</th>
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Motivo do erro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400">A fila está vazia.</td></tr>
            )}
            {itens.map((it) => (
              <tr key={it.id} className="border-t border-line align-top hover:bg-slate-50">
                <td className="px-4 py-2.5 text-ink-700">{it.destinatario}</td>
                <td className="px-4 py-2.5 max-w-[220px] truncate text-ink-700" title={it.assunto}>{it.assunto}</td>
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-navy">{it.protocolo}</td>
                <td className="px-4 py-2.5">
                  <span className={badgeClass(toneFila(it.status))}>{it.status}</span>
                  {it.status === "Aguardando" && (
                    <div className="mt-1 text-[11px] text-ink-400">Encaminharemos no próximo lote</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink-600">{it.tentativas}/{it.maxTentativas}</td>
                <td className="px-4 py-2.5 text-xs text-ink-500">{formatarData(it.enviadoEm ?? it.criadoEm)}</td>
                <td className="px-4 py-2.5 max-w-[220px] text-xs text-danger-ink">{it.erro ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    {(it.status === "Com falha" || it.status === "Cancelado") && (
                      <button onClick={() => reenviar(it.id)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-royal hover:bg-slate-50">
                        <IconRefresh className="h-3.5 w-3.5" /> Reenviar agora
                      </button>
                    )}
                    {(it.status === "Aguardando" || it.status === "Com falha") && (
                      <button onClick={() => cancelar(it.id)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-slate-50">
                        Cancelar envio
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
