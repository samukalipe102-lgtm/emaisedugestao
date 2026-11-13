import React, { useEffect, useMemo, useState } from "react";
import type {
  Solicitacao, StatusSolicitacao, Setor, MensagemHistorico, DadosSolicitacao,
} from "@shared/types";
import {
  badgeClass, toneSolicitacao, formatarData,
} from "../lib/ui";
import { IconCopy, IconCheck, IconArchive, IconMail, IconRefresh } from "../components/icons";

const STATUS: (StatusSolicitacao | "Todas")[] = [
  "Todas", "Nova", "Em análise", "Aguardando correção", "Aguardando aprovação", "Concluída", "Arquivada",
];
const SETORES: (Setor | "Todos")[] = [
  "Todos", "Secretaria Escolar", "Coordenação Pedagógica", "Administração", "Direção Escolar",
];

export function Solicitacoes({ onMudou, refreshSignal = 0 }: { onMudou: () => void; refreshSignal?: number }) {
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [fStatus, setFStatus] = useState<(typeof STATUS)[number]>("Todas");
  const [fSetor, setFSetor] = useState<(typeof SETORES)[number]>("Todos");
  const [selId, setSelId] = useState<number | null>(null);

  const carregar = () => {
    const filtro: any = {};
    if (fStatus !== "Todas") filtro.status = fStatus;
    if (fSetor !== "Todos") filtro.setor = fSetor;
    window.edu.listarSolicitacoes(filtro).then((r) => {
      setLista(r);
      if (selId === null && r.length) setSelId(r[0].id);
    });
  };
  useEffect(carregar, [fStatus, fSetor, refreshSignal]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Solicitações</h1>
          <p className="text-sm text-ink-500">Criadas automaticamente a partir dos e-mails recebidos.</p>
        </div>
        <div className="flex gap-2">
          <select className="field w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="field w-auto" value={fSetor} onChange={(e) => setFSetor(e.target.value as any)}>
            {SETORES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Lista */}
        <div className="card flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {lista.length} solicitação(ões)
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {lista.length === 0 && (
              <div className="p-8 text-center text-sm text-ink-400">
                Nenhuma solicitação. Elas aparecem aqui automaticamente quando um e-mail é recebido.
              </div>
            )}
            {lista.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelId(s.id)}
                className={`block w-full border-b border-line px-4 py-3 text-left transition hover:bg-slate-50 ${
                  selId === s.id ? "bg-blue-50/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-navy">{s.protocolo}</span>
                  <span className={badgeClass(toneSolicitacao(s.status))}>{s.status}</span>
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-ink-900">{s.assunto}</div>
                <div className="mt-0.5 truncate text-xs text-ink-500">{s.processoNome} · {s.setor}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalhe */}
        <div className="min-h-0 overflow-auto">
          {selId !== null ? (
            <Detalhe id={selId} onMudou={() => { carregar(); onMudou(); }} />
          ) : (
            <div className="card flex h-full items-center justify-center p-8 text-sm text-ink-400">
              Selecione uma solicitação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detalhe({ id, onMudou }: { id: number; onMudou: () => void }) {
  const [sol, setSol] = useState<Solicitacao | null>(null);
  const [hist, setHist] = useState<MensagemHistorico[]>([]);
  const [dados, setDados] = useState<DadosSolicitacao | null>(null);
  const [resposta, setResposta] = useState("");
  const [modelos, setModelos] = useState<{ etapa: string; template: string }[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    const s = await window.edu.obterSolicitacao(id);
    setSol(s);
    setDados(s?.dados ?? null);
    setHist(await window.edu.obterHistorico(id));
    if (s?.processoId) setModelos(await window.edu.modelosEmailProcesso(s.processoId));
    else setModelos([]);
  };
  useEffect(() => { carregar(); }, [id]);

  if (!sol || !dados) return <div className="card p-8 text-sm text-ink-400">Carregando…</div>;

  const copiarProtocolo = () => {
    navigator.clipboard.writeText(sol.protocolo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const salvarDados = async () => {
    setSalvandoDados(true);
    await window.edu.atualizarDadosSolicitacao(id, dados);
    await carregar();
    setSalvandoDados(false);
  };

  const revalidar = async () => {
    await window.edu.atualizarDadosSolicitacao(id, dados);
    const r = await window.edu.revalidarCorrecao(id);
    await carregar();
    onMudou();
    alert(r.pendencias.length
      ? `Ainda há divergências:\n\n${r.pendencias.join("\n")}`
      : "Dados validados contra a Base Oficial. ✔");
  };

  const responder = async () => {
    if (!resposta.trim()) return;
    setEnviando(true);
    await window.edu.responderSolicitacao(id, resposta);
    setResposta("");
    await carregar();
    onMudou();
    setEnviando(false);
  };

  const arquivar = async () => {
    await window.edu.arquivarSolicitacao(id);
    await carregar();
    onMudou();
  };

  const campo = (k: keyof DadosSolicitacao, label: string, destaque = false) => (
    <div>
      <label className="label">{label}{destaque && <span className="ml-1 text-royal">★</span>}</label>
      <input
        className={`field ${destaque ? "border-royal font-semibold" : ""}`}
        value={dados[k] ?? ""}
        onChange={(e) => setDados({ ...dados, [k]: e.target.value || null })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={copiarProtocolo} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-navy transition hover:bg-slate-200">
            {copiado ? <IconCheck className="h-4 w-4 text-emerald-ink" /> : <IconCopy className="h-4 w-4" />}
            {sol.protocolo}
          </button>
          <span className={badgeClass(toneSolicitacao(sol.status))}>{sol.status}</span>
          {sol.pedidosCorrecao > 0 && (
            <span className="badge bg-danger-soft text-danger-ink">{sol.pedidosCorrecao} pedido(s) de correção</span>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={arquivar} className="btn-ghost"><IconArchive className="h-4 w-4" /> Arquivar</button>
          </div>
        </div>
        <h2 className="mt-3 text-lg font-bold text-ink-900">{sol.assunto}</h2>
        <p className="text-sm text-ink-500">{sol.processoNome} · {sol.setor} · aberto em {formatarData(sol.criadoEm)}</p>
      </div>

      {/* Dados (editáveis) + pendências */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink-900">Dados da solicitação</h3>
          <span className={badgeClass(sol.correcaoStatus === "Validado" ? "emerald" : sol.correcaoStatus === "Divergente" ? "danger" : "amber")}>
            {sol.correcaoStatus}
          </span>
        </div>
        {sol.pendencias.length > 0 && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger-ink">
            <div className="mb-1 font-semibold">Divergências com a Base Oficial:</div>
            <ul className="list-disc space-y-0.5 pl-5">
              {sol.pendencias.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campo("matricula", "Matrícula", true)}
          {campo("aluno", "Aluno")}
          {campo("turma", "Turma")}
          {campo("unidade", "Unidade escolar")}
          {campo("municipio", "Município")}
          {campo("emailResponsavel", "E-mail do responsável")}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={salvarDados} disabled={salvandoDados} className="btn-ghost">
            {salvandoDados ? "Salvando…" : "Salvar dados"}
          </button>
          <button onClick={revalidar} className="btn-primary"><IconRefresh className="h-4 w-4" /> Revalidar contra Base Oficial</button>
        </div>
      </div>

      {/* Conversa (nunca vazia) */}
      <div className="card p-5">
        <h3 className="mb-3 font-bold text-ink-900">Conversa</h3>
        <div className="space-y-3">
          {hist.length === 0 && <p className="text-sm text-ink-400">Sem mensagens registradas.</p>}
          {hist.map((m) => (
            <div key={m.id} className={`rounded-xl border p-3 ${m.remetente === "solicitante" ? "border-line bg-slate-50" : "border-blue-100 bg-blue-50/40"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-ink-700">
                  {m.remetente === "solicitante" ? "Solicitante" : m.remetente === "sistema" ? "Automação" : "Equipe"}
                </span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-500">{m.de} → {m.para}</span>
                <span className={`ml-auto ${badgeClass(
                  m.status === "Enviado" ? "emerald" : m.status === "Com falha" ? "danger" :
                  m.status === "Recebido" ? "navy" : "amber"
                )}`}>{m.status}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-ink-900">{m.assunto}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{m.corpo}</div>
              <div className="mt-1 text-[11px] text-ink-400">{formatarData(m.criadoEm)}{m.enviadoEm ? ` · enviado ${formatarData(m.enviadoEm)}` : ""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Responder */}
      <div className="card p-5">
        <h3 className="font-bold text-ink-900">Responder solicitação</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <IconMail className="h-4 w-4 text-royal" />
          Canal exclusivo: E-mail institucional · Enviado via fila automática
        </div>
        {modelos.length > 0 && (
          <select
            className="field mt-3"
            defaultValue=""
            onChange={(e) => {
              const m = modelos.find((x) => x.etapa === e.target.value);
              if (m) setResposta(m.template);
            }}
          >
            <option value="">Selecionar modelo de e-mail…</option>
            {modelos.map((m) => <option key={m.etapa} value={m.etapa}>{m.etapa}</option>)}
          </select>
        )}
        <textarea
          className="field mt-3 h-36 resize-none"
          placeholder="Escreva a resposta que será enviada por e-mail ao responsável…"
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <button onClick={responder} disabled={enviando || !resposta.trim()} className="btn-primary">
            <IconMail className="h-4 w-4" /> {enviando ? "Enfileirando…" : "Enviar resposta por e-mail"}
          </button>
        </div>
      </div>
    </div>
  );
}
