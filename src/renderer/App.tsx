import React, { useCallback, useEffect, useState } from "react";
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
  const [refreshKey, setRefreshKey] = useState(0);

  const atualizarTudo = useCallback(() => {
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

  useEffect(atualizarTudo, [atualizarTudo]);
  // status a cada 1s para o cronômetro; demais via push + polling leve
  useIntervalo(() => window.edu.getStatus().then(setStatus), 1000);
  useAtualizacao(() => { atualizarTudo(); setRefreshKey((k) => k + 1); });

  const forcarRefresh = () => { atualizarTudo(); setRefreshKey((k) => k + 1); };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar rota={rota} onNavegar={setRota} badges={badges} status={status} config={config} />
      <main className="flex-1 overflow-auto p-6" key={refreshKey}>
        {rota === "painel" && <Painel status={status} />}
        {rota === "solicitacoes" && <Solicitacoes onMudou={forcarRefresh} />}
        {rota === "processos" && (
          <Processos
            onVerRecebidos={() => setRota("solicitacoes")}
            onVerModelos={() => setModelosAberto(true)}
          />
        )}
        {rota === "revisao" && <Revisao onMudou={forcarRefresh} />}
        {rota === "base" && <BaseOficial />}
        {rota === "fila" && <Fila status={status} onMudou={forcarRefresh} />}
        {rota === "relatorios" && <Relatorios />}
        {rota === "config" && <Configuracoes />}
      </main>
      {modelosAberto && <ModelosModal onFechar={() => setModelosAberto(false)} />}
    </div>
  );
}
