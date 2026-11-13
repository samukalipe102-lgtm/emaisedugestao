import React, { useEffect, useState } from "react";
import type { ItemRevisao } from "@shared/types";
import { formatarData, badgeClass } from "../lib/ui";
import { IconCheck } from "../components/icons";

export function Revisao({ onMudou, refreshSignal = 0 }: { onMudou: () => void; refreshSignal?: number }) {
  const [lista, setLista] = useState<ItemRevisao[]>([]);

  const carregar = () => { window.edu.listarRevisao().then(setLista); };
  useEffect(carregar, [refreshSignal]);

  const aprovar = async (id: number) => {
    await window.edu.aprovarRevisao(id);
    carregar();
    onMudou();
  };
  const rejeitar = async (id: number) => {
    const motivo = prompt("Motivo da rejeição (será registrado na auditoria):");
    if (motivo === null) return;
    await window.edu.rejeitarRevisao(id, motivo || "Sem motivo informado");
    carregar();
    onMudou();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Revisão</h1>
        <p className="text-sm text-ink-500">Etapas críticas que exigem aprovação humana antes do disparo automático.</p>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-ink">
            <IconCheck className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-ink-700">Nenhuma pendência de revisão.</p>
          <p className="text-xs text-ink-400">Quando um fluxo chegar a uma etapa de aprovação, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-navy">{r.protocolo}</span>
                <span className="badge bg-blue-50 text-navy">{r.setor}</span>
                <span className={badgeClass("amber")}>Pendente</span>
                <span className="ml-auto text-xs text-ink-400">{formatarData(r.criadoEm)}</span>
              </div>
              <h3 className="mt-2 font-bold text-ink-900">{r.etapa}</h3>
              <p className="text-sm text-ink-500">{r.processoNome}</p>
              <p className="mt-1 text-sm text-ink-700">{r.descricao}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => aprovar(r.id)} className="btn-primary"><IconCheck className="h-4 w-4" /> Aprovar e disparar e-mail</button>
                <button onClick={() => rejeitar(r.id)} className="btn-ghost">Rejeitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
