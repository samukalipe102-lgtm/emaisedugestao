# EduGestão — Central de Atendimento Escolar

Aplicativo **desktop (Windows)** em que **100% dos processos de atendimento escolar são criados e conduzidos por e-mail**. Toda solicitação nasce de um e-mail real recebido na conta institucional; nada é aberto manualmente. O motor de e-mail roda no processo principal do Electron (continua funcionando com a janela minimizada na bandeja do sistema).

> Nome do produto: **EduGestão — Central de Atendimento Escolar**

## Principais características

- **Sem abertura manual de processos.** Não existe botão "+ Abrir processo". As solicitações são criadas automaticamente quando o leitor de caixa de entrada captura um e-mail na conta institucional configurada.
- **Protocolo único por solicitação** (ex.: `#C1EE754C`), inserido no assunto como `[Protocolo #C1EE754C]`. Respostas são reconhecidas pelo protocolo e anexadas à mesma solicitação, sem duplicar.
- **Motor de e-mail no processo principal** (IMAP via `imapflow`, SMTP via `nodemailer`, parsing via `mailparser`). Funciona em segundo plano na bandeja.
- **Automação e monitoramento** configuráveis e persistidos: intervalo da caixa, horário de início/encerramento, tentativas após falha, dias da semana, sincronização automática e modo "Funcionar 24 horas".
- **Fila de envio** com lock de concorrência: mensagens por lote (máx. 10), intervalo entre lotes (mín. 5 min), tentativas por mensagem com espera progressiva, recuperação de itens travados em "Processando" por mais de 2 minutos, e trilha de auditoria com motivo técnico do erro.
- **Cronômetros regressivos (MM:SS)** segundo a segundo para a próxima verificação da caixa e o próximo lote de envio. Ao chegar a `00:00` (com automação ativa), dispara a leitura/envio e reinicia o ciclo.
- **Validação contra a Base Oficial** usando a **Matrícula** como identificador principal; divergências geram pedido de correção automático por e-mail.
- **Aprovação humana** (tela de Revisão) para as etapas críticas antes do disparo final.

## Telas

Painel · Solicitações · Processos · Revisão · Base Oficial · Fila de envio · Relatórios e Registro de Atividades · Configurações.

## Fluxos padrão (9)

| Setor | Processo | Etapas | SLA (dias) |
|---|---|---|---|
| Secretaria Escolar | Rematrícula de aluno | 5 | 10 |
| Secretaria Escolar | Transferência de aluno | 5 | 7 |
| Secretaria Escolar | Atualização cadastral de aluno | 5 | 5 |
| Coordenação Pedagógica | Busca ativa de alunos infrequentes | 5 | 7 |
| Coordenação Pedagógica | Conselho de classe | 5 | 15 |
| Coordenação Pedagógica | Plano de recuperação paralela | 5 | 20 |
| Coordenação Pedagógica | Devolutiva pedagógica de provas | 5 | 10 |
| Coordenação Pedagógica | Acompanhamento do planejamento docente | 5 | 12 |
| Administração | Conferência mensal de ponto docente | 5 | 10 |

## Arquitetura

```
src/
├─ shared/types.ts        Contrato de dados + IPC (window.edu)
├─ main/                  Processo principal do Electron
│  ├─ index.ts            Ciclo de vida, janela, bandeja, handlers IPC
│  ├─ preload.ts          Ponte contextBridge → window.edu
│  ├─ db.ts               SQLite (better-sqlite3): schema + queries
│  ├─ seed.ts             Catálogo dos 9 processos padrão
│  ├─ config.ts           Config em userData/config.json (credenciais fora do git)
│  ├─ email.ts            IMAP (leitura) + SMTP (envio) + diagnóstico
│  ├─ protocol.ts         Geração/detecção de protocolos
│  ├─ templates.ts        Modelos de e-mail por etapa
│  └─ engine.ts           Orquestração: e-mail→solicitação, fila, cronômetros
└─ renderer/              UI React + Tailwind (Vite)
   ├─ pages/              Painel, Solicitações, Processos, Revisão, Base, Fila, Relatórios, Configurações
   ├─ components/         Sidebar, ícones, modal de modelos
   └─ lib/ui.ts           Cronômetro MM:SS, badges, formatação
```

- **Vite** compila apenas o renderer (`dist-renderer/`).
- **esbuild** empacota `main` + `preload` (`dist-electron/`), mantendo deps nativas externas.
- **electron-builder** gera o instalador **NSIS** e a versão **portátil** (`dist/`).

## Requisitos

- Node.js 22+
- Windows (para gerar e executar o `.exe`)

## Configuração de e-mail (Gmail)

1. Ative a verificação em duas etapas na conta institucional.
2. Gere uma **Senha de app** (IMAP/SMTP).
3. Em **Configurações → Conta institucional**, informe o e-mail e a senha de app (IMAP `imap.gmail.com:993`, SMTP `smtp.gmail.com:465`).
4. Use **Testar recebimento** e **Verificar caixa de entrada agora**.

As credenciais ficam em `userData/config.json`, **fora do binário e fora do git**.

## Desenvolvimento

```bash
npm install            # instala deps e recompila better-sqlite3 para o Electron
npm run dev            # servidor Vite (renderer)
# em outro terminal, aponte o Electron para o dev server:
#   VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

## Build do executável Windows

```bash
npm run build:exe      # gera dist/*.exe (NSIS + portátil)
```

> O empacotamento Windows também é automatizado via GitHub Actions
> (`.github/workflows/release-exe.yml`): ao publicar uma tag `v*`, o runner
> `windows-latest` gera e anexa os `.exe` ao release.

## Privacidade (PII)

Dados de alunos/docentes, banco local e credenciais **nunca** são versionados
(`*.sqlite`, `data/`, `userData/`, `config.json`, `*.xlsx`, `*.csv`). Senhas e
tokens não são registrados em log.
