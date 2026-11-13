import React, { useEffect, useState } from "react";
import type { Relatorios as TRelatorios, LogAuditoria } from "@shared/types";
import { formatarData, badgeClass } from "../lib/ui";

export function Relatorios() {
  const [rel, setRel] = useState<TRelatorios | null>(null);
  const [log, setLog] = useState<LogAuditoria[]>([]);

  useEffect(() => {
    window.edu.obterRelatorios().then(setRel);
    window.edu.listarAuditoria(200).then(setLog);
  }, []);

  const maxSetor = Math.max(1, ...(rel?.porSetor.map((s) => s.total) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Relatórios e Registro de Atividades</h1>
        <p className="text-sm text-ink-500">Métricas por setor e processo, mais o log completo de auditoria.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-ink-900">Por setor</h3>
          {rel?.porSetor.length ? (
            <div className="space-y-3">
              {rel.porSetor.map((s) => (
                <div key={s.setor}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink-700">{s.setor}</span>
                    <span className="text-ink-500">{s.concluidas}/{s.total} concluídas</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-royal" style={{ width: `${(s.total / maxSetor) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-400">Sem dados ainda.</p>}
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-ink-900">Por processo</h3>
          {rel?.porProcesso.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <tr><th className="pb-2">Processo</th><th className="pb-2 text-right">Total</th><th className="pb-2 text-right">Concluídas</th></tr>
              </thead>
              <tbody>
                {rel.porProcesso.map((p) => (
                  <tr key={p.processo} className="border-t border-line">
                    <td className="py-2 font-semibold text-ink-700">{p.processo}</td>
                    <td className="py-2 text-right text-ink-600">{p.total}</td>
                    <td className="py-2 text-right text-emerald-ink">{p.concluidas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-ink-400">Sem dados ainda.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-ink-900">Registro de atividades (auditoria)</h3>
        <div className="max-h-[380px] overflow-auto">
          {log.length === 0 && <p className="text-sm text-ink-400">Nenhum evento registrado.</p>}
          <div className="space-y-2">
            {log.map((l) => (
              <div key={l.id} className="flex items-start gap-3 border-b border-line pb-2 text-sm last:border-0">
                <span className={badgeClass(l.tipo === "humano" ? "navy" : "slate")}>{l.tipo === "humano" ? "Humano" : "Automático"}</span>
                <div className="flex-1">
                  <div className="font-semibold text-ink-700">{l.categoria}{l.protocolo && <span className="ml-2 font-mono text-xs text-navy">{l.protocolo}</span>}</div>
                  <div className="text-ink-600">{l.descricao}</div>
                </div>
                <span className="shrink-0 text-xs text-ink-400">{formatarData(l.criadoEm)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
