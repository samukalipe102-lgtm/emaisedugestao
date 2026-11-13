// ============================================================================
// Geração e detecção de protocolos.
// Cada e-mail capturado recebe um código único (ex.: #C1EE754C) inserido no
// assunto como [Protocolo #C1EE754C]. Respostas são reconhecidas pelo código.
// ============================================================================
import { randomBytes } from "node:crypto";

const PREFIXO = "Protocolo";

/** Gera um código de protocolo único no formato #XXXXXXXX (hex maiúsculo). */
export function gerarProtocolo(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `#${hex}`;
}

/** Monta o marcador que entra no assunto: [Protocolo #XXXXXXXX]. */
export function marcadorProtocolo(protocolo: string): string {
  const limpo = protocolo.startsWith("#") ? protocolo : `#${protocolo}`;
  return `[${PREFIXO} ${limpo}]`;
}

/** Garante que o assunto contém o marcador do protocolo (sem duplicar). */
export function aplicarProtocoloNoAssunto(
  assunto: string,
  protocolo: string
): string {
  const existente = extrairProtocolo(assunto);
  if (existente) return assunto;
  return `${marcadorProtocolo(protocolo)} ${assunto}`.trim();
}

/**
 * Extrai o protocolo de um texto (assunto, corpo, headers).
 * Aceita variações: [Protocolo #ABC12345], Protocolo #ABC12345, #ABC12345.
 */
export function extrairProtocolo(texto: string | null | undefined): string | null {
  if (!texto) return null;
  // 1) marcador completo
  const comMarcador = texto.match(/\[?\s*Protocolo\s*#([0-9A-Fa-f]{6,10})\s*\]?/i);
  if (comMarcador) return `#${comMarcador[1].toUpperCase()}`;
  // 2) código solto com # (8 chars hex típicos)
  const solto = texto.match(/#([0-9A-Fa-f]{8})\b/);
  if (solto) return `#${solto[1].toUpperCase()}`;
  return null;
}
