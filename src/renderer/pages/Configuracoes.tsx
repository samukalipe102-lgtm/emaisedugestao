import React, { useEffect, useState } from "react";
import type {
  AppConfig, ContaEmailConfig, MonitoramentoConfig, FilaConfig, OperadorConfig, DiagnosticoEmail,
} from "@shared/types";
import { IconMail, IconRefresh, IconCheck } from "../components/icons";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Confirmacao({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-ink">
      <IconCheck className="h-4 w-4" /> {texto}
    </span>
  );
}

export function Configuracoes() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);

  const recarregar = () => { window.edu.obterConfig().then(setCfg); };
  useEffect(recarregar, []);

  if (!cfg) return <div className="card p-8 text-sm text-ink-400">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-500">Conta institucional, automação, fila de envio e operador.</p>
      </div>
      <SecaoConta conta={cfg.conta} onSalvo={recarregar} />
      <SecaoMonitoramento m={cfg.monitoramento} onSalvo={recarregar} />
      <SecaoFila f={cfg.fila} onSalvo={recarregar} />
      <SecaoOperador o={cfg.operador} onSalvo={recarregar} />
    </div>
  );
}

// ---------------------------------------------------------------- Conta
function SecaoConta({ conta, onSalvo }: { conta: ContaEmailConfig; onSalvo: () => void }) {
  const [c, setC] = useState(conta);
  const [diag, setDiag] = useState<DiagnosticoEmail | null>(null);
  const [testando, setTestando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [conf, setConf] = useState<string | null>(null);

  useEffect(() => setC(conta), [conta]);

  const salvar = async () => {
    await window.edu.salvarConta(c);
    setConf("Conta salva.");
    setTimeout(() => setConf(null), 2500);
    onSalvo();
  };
  const testar = async () => {
    setTestando(true);
    await window.edu.salvarConta(c);
    setDiag(await window.edu.testarRecebimento());
    onSalvo();
    setTestando(false);
  };
  const verificar = async () => {
    setVerificando(true);
    await window.edu.salvarConta(c);
    const r = await window.edu.verificarCaixaAgora();
    alert(r.mensagem);
    onSalvo();
    setVerificando(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <IconMail className="h-5 w-5 text-royal" />
        <h3 className="font-bold text-ink-900">Conta institucional (IMAP/SMTP)</h3>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Use uma <strong>Senha de app</strong> do Gmail (IMAP/SMTP). Ex.: adminedugestao@gmail.com.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">E-mail institucional</label>
          <input className="field" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Senha de app</label>
          <input type="password" className="field" value={c.senhaApp} onChange={(e) => setC({ ...c, senhaApp: e.target.value })} />
        </div>
        <div><label className="label">IMAP host</label><input className="field" value={c.imapHost} onChange={(e) => setC({ ...c, imapHost: e.target.value })} /></div>
        <div><label className="label">IMAP porta</label><input type="number" className="field" value={c.imapPort} onChange={(e) => setC({ ...c, imapPort: +e.target.value })} /></div>
        <div><label className="label">SMTP host</label><input className="field" value={c.smtpHost} onChange={(e) => setC({ ...c, smtpHost: e.target.value })} /></div>
        <div><label className="label">SMTP porta</label><input type="number" className="field" value={c.smtpPort} onChange={(e) => setC({ ...c, smtpPort: +e.target.value })} /></div>
      </div>

      {diag && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className={`rounded-xl border p-3 text-sm ${diag.imapOk ? "border-emerald/30 bg-emerald-soft text-emerald-ink" : "border-danger/30 bg-danger-soft text-danger-ink"}`}>
            <strong>IMAP:</strong> {diag.imapMensagem}
          </div>
          <div className={`rounded-xl border p-3 text-sm ${diag.smtpOk ? "border-emerald/30 bg-emerald-soft text-emerald-ink" : "border-danger/30 bg-danger-soft text-danger-ink"}`}>
            <strong>SMTP:</strong> {diag.smtpMensagem}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={salvar} className="btn-ghost">Salvar conta</button>
        <button onClick={testar} disabled={testando} className="btn-ghost">{testando ? "Testando…" : "Testar recebimento"}</button>
        <button onClick={verificar} disabled={verificando} className="btn-primary">
          <IconRefresh className="h-4 w-4" /> {verificando ? "Verificando…" : "Verificar caixa de entrada agora"}
        </button>
        <Confirmacao texto={conf} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------- Monitoramento
function SecaoMonitoramento({ m, onSalvo }: { m: MonitoramentoConfig; onSalvo: () => void }) {
  const [v, setV] = useState(m);
  const [conf, setConf] = useState<string | null>(null);
  useEffect(() => setV(m), [m]);

  const salvar = async (next: MonitoramentoConfig, auto = false) => {
    setV(next);
    await window.edu.salvarMonitoramento(next);
    setConf(auto ? "Ajuste salvo automaticamente." : "Monitoramento salvo.");
    setTimeout(() => setConf(null), 2500);
    onSalvo();
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink-900">Automação e monitoramento</h3>
      <p className="mt-1 text-sm text-ink-500">Define quando e com que frequência a caixa é verificada.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Intervalo caixa (min)</label><input type="number" min={1} className="field" value={v.intervaloMin} onChange={(e) => setV({ ...v, intervaloMin: Math.max(1, +e.target.value) })} /></div>
        <div><label className="label">Horário início</label><input type="time" className="field" value={v.horarioInicio} onChange={(e) => setV({ ...v, horarioInicio: e.target.value })} /></div>
        <div><label className="label">Horário encerramento</label><input type="time" className="field" value={v.horarioFim} onChange={(e) => setV({ ...v, horarioFim: e.target.value })} /></div>
        <div><label className="label">Tentativas após falha</label><input type="number" min={0} className="field" value={v.tentativasAposFalha} onChange={(e) => setV({ ...v, tentativasAposFalha: Math.max(0, +e.target.value) })} /></div>
      </div>

      <div className="mt-4">
        <label className="label">Dias da semana</label>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d, i) => (
            <button
              key={d}
              onClick={() => { const dias = [...v.diasSemana]; dias[i] = !dias[i]; salvar({ ...v, diasSemana: dias }, true); }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${v.diasSemana[i] ? "bg-royal text-white" : "border border-line bg-white text-ink-500 hover:bg-slate-50"}`}
            >{d}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Toggle label="Sincronização automática" checked={v.sincronizacaoAutomatica} onChange={(b) => salvar({ ...v, sincronizacaoAutomatica: b }, true)} />
        <Toggle label="Funcionar 24 horas (ignorar restrição de horário comercial)" checked={v.funcionar24h} onChange={(b) => salvar({ ...v, funcionar24h: b }, true)} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => salvar(v)} className="btn-primary">Salvar monitoramento</button>
        <Confirmacao texto={conf} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Fila
function SecaoFila({ f, onSalvo }: { f: FilaConfig; onSalvo: () => void }) {
  const [v, setV] = useState(f);
  const [conf, setConf] = useState<string | null>(null);
  useEffect(() => setV(f), [f]);

  const salvar = async (next: FilaConfig, auto = false) => {
    setV(next);
    await window.edu.salvarFilaConfig(next);
    setConf(auto ? "Ajuste salvo." : "Fila salva.");
    setTimeout(() => setConf(null), 2500);
    onSalvo();
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink-900">Fila de envio</h3>
        <button
          onClick={() => salvar({ ...v, ativa: !v.ativa }, true)}
          className={`badge ${v.ativa ? "bg-emerald-soft text-emerald-ink" : "bg-slate-100 text-ink-600"}`}
        >
          <span className={`h-2 w-2 rounded-full ${v.ativa ? "bg-emerald" : "bg-ink-400"}`} /> {v.ativa ? "Fila ativa" : "Fila pausada"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div><label className="label">Mensagens por lote (máx 10)</label><input type="number" min={1} max={10} className="field" value={v.mensagensPorLote} onChange={(e) => setV({ ...v, mensagensPorLote: Math.min(10, Math.max(1, +e.target.value)) })} /></div>
        <div><label className="label">Intervalo entre lotes (mín 5 min)</label><input type="number" min={5} className="field" value={v.intervaloLoteMin} onChange={(e) => setV({ ...v, intervaloLoteMin: Math.max(5, +e.target.value) })} /></div>
        <div><label className="label">Tentativas por mensagem</label><input type="number" min={1} className="field" value={v.tentativasPorMensagem} onChange={(e) => setV({ ...v, tentativasPorMensagem: Math.max(1, +e.target.value) })} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => salvar(v)} className="btn-primary">Salvar fila</button>
        <Confirmacao texto={conf} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Operador
function SecaoOperador({ o, onSalvo }: { o: OperadorConfig; onSalvo: () => void }) {
  const [v, setV] = useState(o);
  const [conf, setConf] = useState<string | null>(null);
  useEffect(() => setV(o), [o]);
  const salvar = async () => {
    await window.edu.salvarOperador(v);
    setConf("Operador salvo.");
    setTimeout(() => setConf(null), 2500);
    onSalvo();
  };
  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink-900">Operador</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">Nome</label><input className="field" value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div><label className="label">Cargo</label><input className="field" value={v.cargo} onChange={(e) => setV({ ...v, cargo: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={salvar} className="btn-primary">Salvar operador</button>
        <Confirmacao texto={conf} />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-royal" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span className="text-sm font-medium text-ink-700">{label}</span>
    </label>
  );
}
