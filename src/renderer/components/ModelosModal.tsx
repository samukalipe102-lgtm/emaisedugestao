import React, { useEffect, useState } from "react";
import type { Processo } from "@shared/types";

export function ModelosModal({ onFechar }: { onFechar: () => void }) {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [modelos, setModelos] = useState<{ etapa: string; template: string }[]>([]);

  useEffect(() => {
    window.edu.listarProcessos().then((p) => {
      setProcessos(p);
      if (p.length) setSelId(p[0].id);
    });
  }, []);

  useEffect(() => {
    if (selId) window.edu.modelosEmailProcesso(selId).then(setModelos);
  }, [selId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-6" onClick={onFechar}>
      <div className="card flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">Modelos de e-mail</h2>
          <button onClick={onFechar} className="rounded-lg px-2 py-1 text-ink-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] overflow-hidden">
          <div className="overflow-auto border-r border-line">
            {processos.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelId(p.id)}
                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${selId === p.id ? "bg-blue-50/60 font-semibold text-navy" : "text-ink-700"}`}
              >
                {p.nome}
                <div className="text-[11px] text-ink-400">{p.setor}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3 overflow-auto p-5">
            {modelos.map((m) => (
              <div key={m.etapa} className="rounded-xl border border-line p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{m.etapa}</div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700">{m.template}</pre>
                <button
                  onClick={() => navigator.clipboard.writeText(m.template)}
                  className="mt-2 text-xs font-semibold text-royal hover:underline"
                >Copiar modelo</button>
              </div>
            ))}
            {modelos.length === 0 && <p className="text-sm text-ink-400">Sem modelos para este processo.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
