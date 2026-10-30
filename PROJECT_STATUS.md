# PROJECT_STATUS.md — Agenda de Serviços

## Versão atual
Implementação inicial funcional; integração de e-mails em desenvolvimento, **não homologada**.

## Repositório
- GitHub: https://github.com/centroodontologicocgoficial-ux/agendaservicos
- Ramificação principal: `main` (publicação automática configurada).
- Ramificação de desenvolvimento: `feature/verificar-emails-agendamento`.
- Revisão proposta: https://github.com/centroodontologicocgoficial-ux/agendaservicos/pull/1

## Arquitetura obrigatória
Interface → Service → Rules / Validator → Repository → Google Sheets.

## Concluído
- Cadastro manual de clientes, profissionais, serviços e agendamentos já existente.
- Inspeção dos arquivos atuais do GitHub e leitura do PROJECT_GUIDE.md no Google Drive.
- Primeira implementação do botão **Verificar E-mails** em `index.html`.
- Criação de `AgendamentoEmailService.js`, para consultar manualmente Gmail com assunto exato `Agendamento`.
- Busca de cliente, profissional e serviço existentes por nome único.
- Reutilização de `AgendamentoService.cadastrar()` para gravação.
- Adição de consulta de horários em `AgendamentoRepository.js` e verificação de sobreposição em `AgendamentoRules.js`.
- Controle de IDs de mensagens processadas e trava de execução.

## Regra aprovada pelo usuário
Aceitar solicitações de **qualquer remetente**, desde que o assunto seja exatamente `Agendamento`.
Campos esperados no corpo: Cliente, Serviço, Profissional, Data e Hora.
Somente registros válidos devem ser cadastrados; não criar clientes, serviços ou profissionais automaticamente.

## Regra de ativação implementada
- Na primeira execução de **Verificar E-mails**, grava-se a marca de tempo `agenda_email_ativacao_em` nas Script Properties e não são importadas mensagens.
- Nas próximas execuções, apenas mensagens com data de recebimento igual ou posterior à ativação são elegíveis.
- O filtro de busca Gmail é complementar; a data de cada mensagem é conferida individualmente.
- Não há opção automática de reiniciar a ativação, para evitar reprocessamento acidental.

## Em andamento e pendências de validação
- Testar com Gmail e Google Sheets reais, incluindo autorização do Gmail e primeira ativação.
- Verificar a compatibilidade dos formatos de data/hora armazenados na planilha.
- Validar idempotência, duplicidades, duração, conflito de horários e concorrência.
- Revisar limite/paginação da consulta Gmail e tratamento de mensagens rejeitadas; há limite de 300 conversas por verificação.
- Verificar publicação do GitHub Actions e autorização CLASPRC_JSON.
- Não integrar à `main` nem publicar em produção antes dos testes.

## Arquivos criados
- `AgendamentoEmailService.js`
- `PROJECT_STATUS.md` (cópia de acompanhamento no repositório)

## Arquivos alterados
- `AgendamentoRepository.js`
- `AgendamentoRules.js`
- `index.html`

## Arquivos mantidos
- `AgendamentoService.js`
- `AgendamentoValidator.js`
- Demais arquivos do projeto.

## Arquivos excluídos
Nenhum. Arquivos `GradeV2_*` aparentam duplicar conteúdos, mas não devem ser excluídos sem verificar referências e a implantação.

## Próximo passo
Executar testes controlados com mensagens de exemplo e planilha de testes; corrigir falhas encontradas e somente depois aprovar integração à `main`.
