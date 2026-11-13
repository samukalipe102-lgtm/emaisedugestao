// ============================================================================
// Modelos de e-mail por etapa de processo. Usados nos disparos automáticos e
// oferecidos ao operador ao responder manualmente (sempre via fila/e-mail).
// ============================================================================
import type { Processo, Solicitacao } from "../shared/types";

export interface Modelo {
  etapa: string;
  template: string;
}

function saudacao(s: Solicitacao): string {
  const nome = s.dados.aluno ? ` referente ao aluno ${s.dados.aluno}` : "";
  return `Prezado(a) responsável,\n\nRecebemos sua solicitação${nome}.`;
}

/** Texto de confirmação de recebimento (1º disparo automático de todo fluxo). */
export function confirmacaoRecebimento(s: Solicitacao): string {
  return (
    `${saudacao(s)}\n\n` +
    `Sua solicitação foi registrada em nossa Central de Atendimento Escolar sob o ` +
    `protocolo ${s.protocolo}, no processo "${s.processoNome}" (${s.setor}).\n\n` +
    `A partir de agora todo o acompanhamento será feito por e-mail. ` +
    `Para dar continuidade, basta responder a esta mensagem mantendo o protocolo no assunto.\n\n` +
    `Atenciosamente,\nCentral de Atendimento — EduGestão`
  );
}

/** Texto de solicitação de correção, listando pendências detectadas. */
export function solicitacaoCorrecao(s: Solicitacao, pendencias: string[]): string {
  const lista = pendencias.map((p) => `• ${p}`).join("\n");
  return (
    `${saudacao(s)}\n\n` +
    `Ao conferir os dados informados com a nossa Base Oficial, identificamos ` +
    `divergências que precisam ser corrigidas para prosseguirmos:\n\n${lista}\n\n` +
    `Por gentileza, responda este e-mail (protocolo ${s.protocolo}) com os dados corretos.\n\n` +
    `Atenciosamente,\nCentral de Atendimento — EduGestão`
  );
}

/** Texto de aprovação / conclusão (certificado/confirmação final). */
export function confirmacaoAprovacao(s: Solicitacao): string {
  return (
    `${saudacao(s)}\n\n` +
    `Temos uma ótima notícia: a etapa "${s.processoNome}" foi APROVADA e concluída ` +
    `com sucesso (protocolo ${s.protocolo}).\n\n` +
    `Este e-mail serve como confirmação oficial da conclusão da solicitação.\n\n` +
    `Agradecemos o contato.\nCentral de Atendimento — EduGestão`
  );
}

/** Modelos exibidos na tela (seletor de template ao responder). */
export function modelosDoProcesso(p: Processo): Modelo[] {
  return [
    {
      etapa: "Confirmação de recebimento",
      template:
        `Prezado(a) responsável,\n\nRecebemos sua solicitação referente a "${p.nome}". ` +
        `Ela foi registrada e seguirá o acompanhamento por e-mail.\n\nAtenciosamente,\nCentral de Atendimento — EduGestão`,
    },
    {
      etapa: "Solicitação de correção",
      template:
        `Prezado(a) responsável,\n\nIdentificamos divergências nos dados informados. ` +
        `Por favor, responda este e-mail com as informações corrigidas.\n\nAtenciosamente,\nCentral de Atendimento — EduGestão`,
    },
    {
      etapa: p.gatilhoAprovacao,
      template:
        `Prezado(a) responsável,\n\nInformamos que "${p.nome}" foi concluída com sucesso. ` +
        `Este e-mail confirma a finalização da sua solicitação.\n\nAtenciosamente,\nCentral de Atendimento — EduGestão`,
    },
  ];
}
