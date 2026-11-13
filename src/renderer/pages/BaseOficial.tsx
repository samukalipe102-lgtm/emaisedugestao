import React, { useEffect, useRef, useState } from "react";
import type { RegistroBase } from "@shared/types";

export function BaseOficial() {
  const [tipo, setTipo] = useState<"aluno" | "docente">("aluno");
  const [lista, setLista] = useState<RegistroBase[]>([]);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = () => { window.edu.listarBase(tipo).then(setLista); };
  useEffect(carregar, [tipo]);

  const importar = async (file: File) => {
    const texto = await file.text();
    const r = await window.edu.importarBase(tipo, texto, file.name);
    if (r.ok) {
      setMsg({ ok: true, texto: `Importado: ${r.inseridos} inseridos, ${r.atualizados} atualizados.` });
      carregar();
    } else {
      setMsg({ ok: false, texto: r.erro || "Falha na importação." });
    }
    setTimeout(() => setMsg(null), 6000);
  };

  const filtrada = lista.filter((r) =>
    `${r.matricula} ${r.nome} ${r.turma ?? ""} ${r.unidade ?? ""} ${r.municipio ?? ""}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Base Oficial</h1>
          <p className="text-sm text-ink-500">Fonte da verdade para validação cadastral — organizada por <strong>Matrícula</strong>.</p>
        </div>
        <div className="flex gap-2">
          <select className="field w-auto" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            <option value="aluno">Alunos</option>
            <option value="docente">Docentes</option>
          </select>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }}
          />
          <button className="btn-primary" onClick={() => inputRef.current?.click()}>Importar .xlsx/.csv</button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3 text-sm ${msg.ok ? "border-emerald/30 bg-emerald-soft text-emerald-ink" : "border-danger/30 bg-danger-soft text-danger-ink"}`}>
          {msg.texto}
        </div>
      )}

      <div className="card p-3">
        <input className="field" placeholder="Buscar por matrícula, nome, turma, unidade…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="card min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Unidade Escolar</th>
              <th className="px-4 py-3">Município</th>
              <th className="px-4 py-3">E-mail do Responsável</th>
            </tr>
          </thead>
          <tbody>
            {filtrada.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                Nenhum registro. Importe um arquivo .csv/.xlsx com as colunas matricula, nome, turma, unidade, municipio, emailResponsavel.
              </td></tr>
            )}
            {filtrada.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono font-semibold text-navy">{r.matricula}</td>
                <td className="px-4 py-2.5 font-semibold text-ink-900">{r.nome}</td>
                <td className="px-4 py-2.5 text-ink-600">{r.turma ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-600">{r.unidade ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-600">{r.municipio ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-600">{r.emailResponsavel ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">
        {filtrada.length} de {lista.length} registro(s). Observação: arquivos .xlsx devem ser exportados como CSV (UTF-8) para importação.
      </p>
    </div>
  );
}
