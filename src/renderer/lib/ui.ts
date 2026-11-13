// ============================================================================
// Utilidades de UI do renderer: formatação de tempo (MM:SS), cronômetro
// regressivo second-by-second e mapeamento de status -> estilo de badge.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import type { StatusSolicitacao, StatusFilaItem } from "@shared/types";

/** Formata segundos em MM:SS. null => "--:--". */
export function formatarMMSS(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || segundos < 0) return "--:--";
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cronômetro regressivo local. Recebe o valor-alvo (segundos) vindo do main e
 * decrementa a cada segundo no cliente, para animar o relógio suavemente entre
 * as atualizações push. Quando o main envia um novo valor, sincroniza.
 */
export function useCountdown(segundosAlvo: number | null): number | null {
  const [valor, setValor] = useState<number | null>(segundosAlvo);
  const ref = useRef<number | null>(segundosAlvo);

  useEffect(() => {
    ref.current = segundosAlvo;
    setValor(segundosAlvo);
  }, [segundosAlvo]);

  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current === null) return;
      ref.current = Math.max(0, ref.current - 1);
      setValor(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return valor;
}

/** Hook: assina eventos de atualização do main e dispara o callback. */
export function useAtualizacao(cb: () => void): void {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const off = window.edu.onAtualizacao(() => ref.current());
    return off;
  }, []);
}

/** Hook de polling simples (fallback + cadência de 1s para o status). */
export function useIntervalo(cb: () => void, ms: number): void {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

type BadgeTone = "emerald" | "amber" | "danger" | "navy" | "slate";

const TONE_CLASS: Record<BadgeTone, string> = {
  emerald: "bg-emerald-soft text-emerald-ink",
  amber: "bg-amber-soft text-amber-ink",
  danger: "bg-danger-soft text-danger-ink",
  navy: "bg-blue-50 text-navy",
  slate: "bg-slate-100 text-ink-600",
};

export function badgeClass(tone: BadgeTone): string {
  return `badge ${TONE_CLASS[tone]}`;
}

export function toneSolicitacao(status: StatusSolicitacao): BadgeTone {
  switch (status) {
    case "Nova":
      return "navy";
    case "Em análise":
      return "amber";
    case "Aguardando correção":
      return "danger";
    case "Aguardando aprovação":
      return "amber";
    case "Concluída":
      return "emerald";
    case "Arquivada":
      return "slate";
  }
}

export function toneFila(status: StatusFilaItem): BadgeTone {
  switch (status) {
    case "Aguardando":
      return "amber";
    case "Processando":
      return "navy";
    case "Enviado":
      return "emerald";
    case "Com falha":
      return "danger";
    case "Cancelado":
      return "slate";
  }
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
