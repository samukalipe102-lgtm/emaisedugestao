import React, { useEffect, useState } from "react";
import type { Processo, Setor } from "@shared/types";
import { IconMail } from "../components/icons";

const TABS: (Setor | "Todos")[] = [
  "Todos", "Secretaria Escolar", "Coordenação Pedagógica", "Administração", "Direção Escolar",
];

export function Processos({ onVerRecebidos, onVerModelos }: {
  onVerRecebidos: () => void;
  onVerModelos: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Todos");
  const [lista, setLista] = useState<Processo[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    window.edu.listarProcessos(tab === "Todos" ? undefined : tab).then(setLista);
  }, [tab]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Processos</h1>
        <p className="text-sm text-ink-500">Fluxos automáticos por setor. Nenhum processo é aberto manualmente.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-ink-900 text-white" : "border border-line bg-white text-ink-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-ink-900">{p.nome}</h3>
                <span className="badge bg-blue-50 text-navy">{p.slaDias} dias</span>
              </div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{p.setor}</div>
              <p className="mt-2 text-sm text-ink-600">{p.descricao}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="badge bg-slate-100 text-ink-600">{p.etapas.length} etapas</span>
                <span className="badge bg-emerald-soft text-emerald-ink">{p.respostasAutomaticas} disparos automáticos</span>
              </div>
              <button
                onClick={() => setAberto(aberto === p.id ? null : p.id)}
                className="mt-3 text-left text-sm font-semibold text-royal hover:underline"
              >
                {aberto === p.id ? "Ocultar etapas" : "Ver etapas do fluxo"}
              </button>
              {aberto === p.id && (
                <ol className="mt-2 space-y-1.5">
                  {p.etapas.map((e) => (
                    <li key={e.ordem} className="flex items-start gap-2 text-sm text-ink-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-ink-600">{e.ordem}</span>
                      <span>{e.nome}{e.requerAprovacao && <span className="ml-1 text-amber-ink">(aprovação humana)</span>}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé: automação ativa + ações (sem botão de abrir processo) */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="badge bg-emerald-soft text-emerald-ink">
          <span className="h-2 w-2 rounded-full bg-emerald" /> Automação ativa · Somente via e-mail
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={onVerRecebidos} className="btn-ghost">Ver processos recebidos</button>
          <button onClick={onVerModelos} className="btn-primary"><IconMail className="h-4 w-4" /> Modelos de e-mail</button>
        </div>
      </div>
    </div>
  );
}
