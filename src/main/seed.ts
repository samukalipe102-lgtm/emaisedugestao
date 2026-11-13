// ============================================================================
// Catálogo padrão de processos (9 fluxos automáticos distribuídos por setor).
// Usado para popular a tabela `processos` na primeira execução.
// ============================================================================
import type { Processo } from "../shared/types";

function etapas(nomes: [string, boolean][]): Processo["etapas"] {
  return nomes.map(([nome, requerAprovacao], i) => ({
    ordem: i + 1,
    nome,
    descricao: nome,
    requerAprovacao,
  }));
}

export const PROCESSOS_PADRAO: Processo[] = [
  // ----------------------------------------------------------------- Secretaria
  {
    id: "sec-rematricula",
    nome: "Rematrícula de aluno",
    setor: "Secretaria Escolar",
    descricao:
      "Confirmação e efetivação de rematrícula do aluno para o período letivo seguinte.",
    slaDias: 10,
    etapas: etapas([
      ["Recebimento da solicitação", false],
      ["Conferência cadastral na Base Oficial", false],
      ["Pedido de correção (se houver divergência)", false],
      ["Aprovação humana da efetivação", true],
      ["Confirmação de rematrícula por e-mail", false],
    ]),
    respostasAutomaticas: 3,
    gatilhoAprovacao: "Efetivação de rematrícula",
    disparosAutomaticos: [
      "Confirmação de recebimento",
      "Solicitação de correção cadastral",
      "Certificado/confirmação de rematrícula aprovada",
    ],
    palavrasChave: ["rematricula", "rematrícula", "renovar matricula", "renovação de matrícula"],
    ativo: true,
  },
  {
    id: "sec-transferencia",
    nome: "Transferência de aluno",
    setor: "Secretaria Escolar",
    descricao: "Emissão de documentação e baixa/entrada de aluno por transferência.",
    slaDias: 7,
    etapas: etapas([
      ["Recebimento da solicitação", false],
      ["Verificação de documentos e vínculo", false],
      ["Pedido de documentos pendentes", false],
      ["Aprovação humana da transferência", true],
      ["Envio da declaração de transferência", false],
    ]),
    respostasAutomaticas: 3,
    gatilhoAprovacao: "Efetivação de transferência",
    disparosAutomaticos: [
      "Confirmação de recebimento",
      "Solicitação de documentos",
      "Declaração de transferência aprovada",
    ],
    palavrasChave: ["transferencia", "transferência", "transferir aluno", "declaração de transferência"],
    ativo: true,
  },
  {
    id: "sec-atualizacao-cadastral",
    nome: "Atualização cadastral de aluno",
    setor: "Secretaria Escolar",
    descricao: "Atualização de dados cadastrais (endereço, responsável, contato) do aluno.",
    slaDias: 5,
    etapas: etapas([
      ["Recebimento da solicitação", false],
      ["Comparação com a Base Oficial", false],
      ["Pedido de correção (se houver divergência)", false],
      ["Validação final dos dados", true],
      ["Confirmação de atualização por e-mail", false],
    ]),
    respostasAutomaticas: 3,
    gatilhoAprovacao: "Validação cadastral",
    disparosAutomaticos: [
      "Confirmação de recebimento",
      "Solicitação de correção cadastral",
      "Confirmação de dados atualizados",
    ],
    palavrasChave: ["atualização cadastral", "atualizar cadastro", "mudança de endereço", "atualização de dados"],
    ativo: true,
  },
  // -------------------------------------------------------------- Coordenação
  {
    id: "coord-busca-ativa",
    nome: "Busca ativa de alunos infrequentes",
    setor: "Coordenação Pedagógica",
    descricao: "Acompanhamento e contato com responsáveis de alunos com faltas excessivas.",
    slaDias: 7,
    etapas: etapas([
      ["Recebimento do alerta de infrequência", false],
      ["Identificação do aluno na Base Oficial", false],
      ["Notificação ao responsável", false],
      ["Registro de retorno do responsável", false],
      ["Encerramento com parecer pedagógico", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Parecer pedagógico final",
    disparosAutomaticos: [
      "Notificação ao responsável",
      "Confirmação de acompanhamento",
    ],
    palavrasChave: ["busca ativa", "infrequente", "faltas", "aluno faltoso", "frequência"],
    ativo: true,
  },
  {
    id: "coord-conselho-classe",
    nome: "Conselho de classe",
    setor: "Coordenação Pedagógica",
    descricao: "Organização, convocação e consolidação das atas do conselho de classe.",
    slaDias: 15,
    etapas: etapas([
      ["Abertura do processo de conselho", false],
      ["Convocação dos docentes", false],
      ["Coleta de pareceres por turma", false],
      ["Consolidação da ata", false],
      ["Aprovação e publicação da ata", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Publicação da ata do conselho",
    disparosAutomaticos: [
      "Convocação dos docentes",
      "Confirmação de recebimento de pareceres",
    ],
    palavrasChave: ["conselho de classe", "conselho", "ata de conselho", "pareceres"],
    ativo: true,
  },
  {
    id: "coord-recuperacao-paralela",
    nome: "Plano de recuperação paralela",
    setor: "Coordenação Pedagógica",
    descricao: "Elaboração e acompanhamento de planos de recuperação para alunos com defasagem.",
    slaDias: 20,
    etapas: etapas([
      ["Identificação dos alunos em recuperação", false],
      ["Solicitação do plano ao docente", false],
      ["Validação pedagógica do plano", false],
      ["Comunicação ao responsável", false],
      ["Aprovação do fechamento do plano", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Fechamento do plano de recuperação",
    disparosAutomaticos: [
      "Solicitação de plano ao docente",
      "Comunicação ao responsável",
    ],
    palavrasChave: ["recuperação paralela", "recuperação", "plano de recuperação", "reforço"],
    ativo: true,
  },
  {
    id: "coord-devolutiva-provas",
    nome: "Devolutiva pedagógica de provas",
    setor: "Coordenação Pedagógica",
    descricao: "Consolidação e devolutiva dos resultados de avaliações às famílias.",
    slaDias: 10,
    etapas: etapas([
      ["Recebimento dos resultados", false],
      ["Conferência de notas por aluno", false],
      ["Solicitação de ajustes (se houver)", false],
      ["Preparação da devolutiva", false],
      ["Aprovação e envio da devolutiva", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Envio da devolutiva pedagógica",
    disparosAutomaticos: [
      "Solicitação de ajuste de notas",
      "Devolutiva pedagógica às famílias",
    ],
    palavrasChave: ["devolutiva", "resultado de prova", "notas", "avaliação", "boletim"],
    ativo: true,
  },
  {
    id: "coord-planejamento-docente",
    nome: "Acompanhamento do planejamento docente",
    setor: "Coordenação Pedagógica",
    descricao: "Recebimento, análise e devolutiva dos planejamentos (BNCC) dos docentes.",
    slaDias: 12,
    etapas: etapas([
      ["Recebimento do planejamento", false],
      ["Análise de aderência à BNCC", false],
      ["Solicitação de ajustes", false],
      ["Revalidação do planejamento", false],
      ["Aprovação do planejamento", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Aprovação do planejamento docente",
    disparosAutomaticos: [
      "Solicitação de ajuste de planejamento",
      "Confirmação de aprovação do planejamento",
    ],
    palavrasChave: ["planejamento", "planejamento docente", "bncc", "plano de aula", "plano de ensino"],
    ativo: true,
  },
  // ------------------------------------------------------------- Administração
  {
    id: "adm-ponto-docente",
    nome: "Conferência mensal de ponto docente",
    setor: "Administração",
    descricao: "Conferência mensal da folha de ponto dos docentes e tratamento de divergências.",
    slaDias: 10,
    etapas: etapas([
      ["Recebimento da folha de ponto", false],
      ["Conferência de registros", false],
      ["Solicitação de justificativas", false],
      ["Consolidação do fechamento", false],
      ["Aprovação do fechamento mensal", true],
    ]),
    respostasAutomaticas: 2,
    gatilhoAprovacao: "Fechamento mensal de ponto",
    disparosAutomaticos: [
      "Solicitação de justificativa de ponto",
      "Confirmação de fechamento de ponto",
    ],
    palavrasChave: ["ponto", "folha de ponto", "frequência docente", "conferência de ponto"],
    ativo: true,
  },
];
