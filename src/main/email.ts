// ============================================================================
// Motor de e-mail: leitura IMAP (imapflow) + parsing (mailparser) + envio SMTP
// (nodemailer). Roda no processo principal do Electron (funciona em segundo
// plano / bandeja). É aqui que solicitações NASCEM — exclusivamente a partir
// de e-mails reais recebidos na conta institucional configurada.
// ============================================================================
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer, { type Transporter } from "nodemailer";
import type {
  ContaEmailConfig,
  DiagnosticoEmail,
  Setor,
  DadosSolicitacao,
} from "../shared/types";
import { extrairProtocolo, aplicarProtocoloNoAssunto } from "./protocol";

export interface EmailRecebido {
  messageId: string;
  de: string;
  deNome: string;
  assunto: string;
  corpoTexto: string;
  anexos: string[];
  protocolo: string | null;
  data: Date;
}

function logarImap(conta: ContaEmailConfig): ImapFlow {
  return new ImapFlow({
    host: conta.imapHost,
    port: conta.imapPort,
    secure: true,
    auth: { user: conta.email, pass: conta.senhaApp },
    logger: false,
  });
}

function transporteSmtp(conta: ContaEmailConfig): Transporter {
  return nodemailer.createTransport({
    host: conta.smtpHost,
    port: conta.smtpPort,
    secure: conta.smtpSecure,
    auth: { user: conta.email, pass: conta.senhaApp },
  });
}

/** Testa recebimento (IMAP) e envio (SMTP) e devolve diagnóstico detalhado. */
export async function testarRecebimento(conta: ContaEmailConfig): Promise<DiagnosticoEmail> {
  const resultado: DiagnosticoEmail = {
    imapOk: false,
    smtpOk: false,
    imapMensagem: "",
    smtpMensagem: "",
  };

  // IMAP
  try {
    const client = logarImap(conta);
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const box: any = client.mailbox;
      resultado.imapOk = true;
      resultado.imapMensagem = `Conectado à INBOX (${box?.exists ?? 0} mensagens).`;
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e: any) {
    resultado.imapOk = false;
    resultado.imapMensagem = `Falha IMAP: ${e?.message ?? String(e)}`;
  }

  // SMTP
  try {
    const t = transporteSmtp(conta);
    await t.verify();
    resultado.smtpOk = true;
    resultado.smtpMensagem = "Servidor SMTP pronto para envio.";
    t.close();
  } catch (e: any) {
    resultado.smtpOk = false;
    resultado.smtpMensagem = `Falha SMTP: ${e?.message ?? String(e)}`;
  }

  return resultado;
}

/**
 * Lê e-mails NÃO vistos da INBOX e os marca como vistos. Ignora mensagens
 * enviadas pela própria conta (evita loop de automação). Retorna os e-mails
 * já parseados; a classificação/criação de solicitação acontece na camada
 * de orquestração (index.ts).
 */
export async function lerNaoVistos(conta: ContaEmailConfig): Promise<EmailRecebido[]> {
  const recebidos: EmailRecebido[] = [];
  const client = logarImap(conta);
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    // apenas não lidos
    const uids = await client.search({ seen: false });
    if (!uids || uids.length === 0) return recebidos;
    for await (const msg of client.fetch(uids, { source: true, envelope: true })) {
      try {
        const parsed = await simpleParser(msg.source as Buffer);
        const fromAddr = parsed.from?.value?.[0];
        const de = (fromAddr?.address ?? "").toLowerCase();
        // ignora e-mails enviados pela própria conta institucional
        if (de && de === conta.email.toLowerCase()) {
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
          continue;
        }
        const assunto = parsed.subject ?? "(sem assunto)";
        const corpoTexto = parsed.text ?? stripHtml(parsed.html || "");
        recebidos.push({
          messageId: parsed.messageId ?? `${msg.uid}@${conta.email}`,
          de,
          deNome: fromAddr?.name ?? de,
          assunto,
          corpoTexto,
          anexos: (parsed.attachments ?? []).map((a) => a.filename ?? "anexo"),
          protocolo:
            extrairProtocolo(assunto) ||
            extrairProtocolo(corpoTexto) ||
            extrairProtocolo(parsed.inReplyTo),
          data: parsed.date ?? new Date(),
        });
      } finally {
        // marca como vista mesmo em erro de parse, para não reprocessar infinitamente
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return recebidos;
}

/** Envia um e-mail. Garante o marcador de protocolo no assunto. */
export async function enviarEmail(
  conta: ContaEmailConfig,
  destinatario: string,
  assunto: string,
  corpo: string,
  protocolo: string
): Promise<void> {
  const t = transporteSmtp(conta);
  try {
    const assuntoFinal = aplicarProtocoloNoAssunto(assunto, protocolo);
    await t.sendMail({
      from: { name: "EduGestão — Central de Atendimento", address: conta.email },
      to: destinatario,
      subject: assuntoFinal,
      text: corpo,
      html: corpoHtml(corpo, protocolo),
    });
  } finally {
    t.close();
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|br|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function corpoHtml(texto: string, protocolo: string): string {
  const html = texto
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;max-width:560px">
    <div style="background:#0F172A;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
      <strong>EduGestão — Central de Atendimento Escolar</strong>
    </div>
    <div style="border:1px solid #E2E8F0;border-top:none;padding:20px;border-radius:0 0 12px 12px">
      ${html}
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0"/>
      <p style="font-size:12px;color:#64748B;margin:0">
        Protocolo <strong>${protocolo}</strong> · Canal exclusivo: e-mail institucional.<br/>
        Para dar continuidade, responda este e-mail mantendo o protocolo no assunto.
      </p>
    </div>
  </div>`;
}

/**
 * Classifica um e-mail recebido em um setor/processo com base em palavras-chave.
 * Fallback: "Solicitação Geral" na Secretaria Escolar.
 */
export function classificar(
  assunto: string,
  corpo: string,
  processos: { id: string; nome: string; setor: Setor; palavrasChave: string[] }[]
): { processoId: string | null; processoNome: string; setor: Setor } {
  const texto = `${assunto}\n${corpo}`.toLowerCase();
  for (const p of processos) {
    if (p.palavrasChave.some((k) => texto.includes(k.toLowerCase()))) {
      return { processoId: p.id, processoNome: p.nome, setor: p.setor };
    }
  }
  return { processoId: null, processoNome: "Solicitação Geral", setor: "Secretaria Escolar" };
}

/**
 * Extrai dados cadastrais prováveis do corpo do e-mail (matrícula, aluno, etc.)
 * Sem IA: usa heurísticas de rótulo. Campos ausentes ficam null (sem inventar).
 */
export function extrairDados(corpo: string): DadosSolicitacao {
  const campo = (rotulos: string[]): string | null => {
    for (const r of rotulos) {
      const re = new RegExp(`${r}\\s*[:\\-]\\s*([^\\n\\r]+)`, "i");
      const m = corpo.match(re);
      if (m) return m[1].trim();
    }
    return null;
  };
  // matrícula: rótulo explícito ou sequência numérica isolada (6+ dígitos)
  let matricula = campo(["matr[ií]cula", "matricula", "ra", "registro"]);
  if (!matricula) {
    const m = corpo.match(/\b(\d{6,})\b/);
    matricula = m ? m[1] : null;
  }
  const emailResp = (() => {
    const m = corpo.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return m ? m[0] : null;
  })();
  return {
    matricula,
    aluno: campo(["aluno", "estudante", "nome do aluno", "nome"]),
    turma: campo(["turma", "s[ée]rie", "ano"]),
    unidade: campo(["unidade", "escola", "unidade escolar"]),
    municipio: campo(["munic[ií]pio", "cidade"]),
    emailResponsavel: campo(["e-mail do respons[áa]vel", "email do responsavel", "respons[áa]vel"]) || emailResp,
  };
}
