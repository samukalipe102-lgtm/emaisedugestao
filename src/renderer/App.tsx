import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar, type Rota } from "./components/Sidebar";
import { Painel } from "./pages/Painel";
import { Solicitacoes } from "./pages/Solicitacoes";
import { Processos } from "./pages/Processos";
import { Revisao } from "./pages/Revisao";
import { BaseOficial } from "./pages/BaseOficial";
import { Fila } from "./pages/Fila";
import { Relatorios } from "./pages/Relatorios";
import { Configuracoes } from "./pages/Configuracoes";
import { ModelosModal } from "./components/ModelosModal";
import { useAtualizacao, useIntervalo } from "./lib/ui";
import type { AppConfig, StatusTempoReal } from "@shared/types";

export function App() {
  const [rota, setRota] = useState<Rota>("painel");
  const [status, setStatus] = useState<StatusTempoReal | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [badges, setBadges] = useState({ solicitacoes: 0, revisao: 0 });
  const [modelosAberto, setModelosAberto] = useState(false);
  // Sinal de refresh NÃO destrutivo: as páginas observam este número e
  // recarregam seus dados sem serem desmontadas (evita piscar/perder foco).
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Atualiza apenas o enxoval do shell (status + badges + config). NÃO remonta
  // a página ativa, para a digitação nos formulários não ser interrompida.
  const atualizarShell = useCallback(() => {
    window.edu.getStatus().then(setStatus);
    window.edu.obterConfig().then(setConfig);
    window.edu.listarSolicitacoes().then((s) =>
      setBadges((b) => ({
        ...b,
        solicitacoes: s.filter((x) => x.status !== "Concluída" && x.status !== "Arquivada").length,
      }))
    );
    window.edu.listarRevisao().then((r) => setBadges((b) => ({ ...b, revisao: r.length })));
  }, []);

  useEffect(() => { atualizarShell(); }, [atualizarShell]);

  // Cronômetro: só o status a cada 1s. É um objeto pequeno; a animação MM:SS
  // é feita localmente pelo hook useCountdown, então isto não causa flicker.
  useIntervalo(() => window.edu.getStatus().then(setStatus), 1000);

  // Push do processo principal (e-mail recebido/enviado etc.): atualiza o shell
  // e incrementa o sinal com throttle, para as páginas recarregarem os dados
  // sem remontar. Throttle evita um re-fetch por segundo vindo do tick.
  const ultimoSinal = useRef(0);
  useAtualizacao(() => {
    atualizarShell();
    const agora = Date.now();
    if (agora - ultimoSinal.current > 1500) {
      ultimoSinal.current = agora;
      setRefreshSignal((k) => k + 1);
    }
  });

  // Chamado por ações do usuário dentro das páginas (responder, aprovar…).
  const forcarRefresh = useCallback(() => {
    atualizarShell();
    setRefreshSignal((k) => k + 1);
  }, [atualizarShell]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar rota={rota} onNavegar={setRota} badges={badges} status={status} config={config} />
      <main className="flex-1 overflow-auto p-6">
        {rota === "painel" && <Painel status={status} />}
        {rota === "solicitacoes" && <Solicitacoes refreshSignal={refreshSignal} onMudou={forcarRefresh} />}
        {rota === "processos" && (
          <Processos
            onVerRecebidos={() => setRota("solicitacoes")}
            onVerModelos={() => setModelosAberto(true)}
          />
        )}
        {rota === "revisao" && <Revisao refreshSignal={refreshSignal} onMudou={forcarRefresh} />}
        {rota === "base" && <BaseOficial />}
        {rota === "fila" && <Fila status={status} onMudou={forcarRefresh} />}
        {rota === "relatorios" && <Relatorios />}
        {rota === "config" && <Configuracoes />}
      </main>
      {modelosAberto && <ModelosModal onFechar={() => setModelosAberto(false)} />}
    </div>
  );
}
