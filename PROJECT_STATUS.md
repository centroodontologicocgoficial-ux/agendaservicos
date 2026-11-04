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

## Etapa: envio de confirmação e lembretes (29/10/2026)
- **Implementado em ramificação de desenvolvimento, não homologado.**
- Novo `AgendamentoEmailEnvioService.js`: confirmação ao cliente após salvar o agendamento; lembrete para agendamentos AGENDADO ou CONFIRMADO nas próximas 24 horas.
- `AgendamentoService.js` alterado para solicitar confirmação após gravação; falha no envio não desfaz agendamento salvo.
- `AgendamentoRepository.js` alterado para ler a coluna E-mail de CLIENTES e os agendamentos com seus códigos.
- `PROJECT_STATUS.md` atualizado no GitHub; o documento homônimo no Google Drive permanece separado.
- O envio é feito via `MailApp`, sujeito à autorização e cotas do Google Apps Script.
- O lembrete **não tem gatilho automático instalado**. Executar `verificarLembretesAgendamento` manualmente ou configurar um gatilho diário no Apps Script após homologação.
- Evita reenvio usando `PropertiesService` por código de agendamento e, no lembrete, data/hora.
- Pendências: testes reais de integração, verificar dados de clientes e horários, cotas e autorização de e-mail; confirmar timezone do projeto; testar falha de MailApp e idempotência; validar execução de gatilho.
- Arquivos criados: `AgendamentoEmailEnvioService.js`.
- Arquivos alterados: `AgendamentoService.js`, `AgendamentoRepository.js`, `PROJECT_STATUS.md`.
- Arquivos mantidos: demais arquivos, inclusive `AgendamentoEmailService.js` e `PROJECT_GUIDE.md`.
- Arquivos excluídos: nenhum; não há exclusões seguras identificadas.
- Como testar: em cópia de testes, cadastrar cliente com e-mail controlado, criar agendamento e verificar confirmação; executar `verificarLembretesAgendamento` com atendimento dentro de 24h e executar novamente para confirmar ausência de duplicação.

## Testes isolados de notificações — 29/10/2026
- Executados 5 testes com os arquivos reais obtidos do GitHub e dependências simuladas: confirmação, não duplicação de confirmação, primeira ativação, exclusão de e-mails antigos e cancelamento.
- Resultado: **5 aprovados, 0 reprovados** no ambiente simulado.
- Criado `AgendamentoEmailEnvio.test.cjs` e `.github/workflows/agendamento-tests.yml`.
- Não foi possível confirmar execução do GitHub Actions nessa ramificação: nenhuma execução apareceu na consulta ao histórico.
- Não houve envio real de e-mail, gravação real em planilha nem implantação.
- Próximo passo: testes de integração no Apps Script em ambiente controlado, incluindo lembrete de 24h, permissões e cotas.

## Correção da importação de e-mails — 29/10/2026
- `AgendamentoEmailService.js` aceita assunto `AGENDAMENTO` independentemente de maiúsculas/minúsculas e os campos `Hora:` e `Horário:`.
- Mantidas as regras: apenas mensagens posteriores à ativação, correspondência com cadastros existentes, validação e prevenção de duplicação.
- Teste isolado executado com assunto `AGENDAMENTO`, campo `Horário: 14:30`, data `30/10/2026`: 1 cadastro simulado; segunda execução: 0 novos, 1 ignorado.
- Não foram executados testes com Gmail e Sheets reais nesta etapa.
- Arquivo alterado: `AgendamentoEmailService.js`. Demais arquivos mantidos. Nenhum excluído.
- Próximo passo: validar importação real e publicar após revisão.

## Relatório de verificação de e-mails — 29/10/2026
- Adicionado relatório individual com assunto, remetente, recebimento, conteúdo, situação e motivo do cadastro ou rejeição.
- Arquivos alterados: AgendamentoEmailService.js e index.html. Nenhum arquivo removido.
- Teste isolado: e-mail válido cadastrado, cliente inexistente rejeitado com motivo e e-mail já processado não duplicado.
- Testes reais de Gmail/Sheets e publicação na main ainda pendentes.

## Correção proposta — repositório duplicado (03/11/2026)
- Diagnóstico: `GradeV2_AgendamentoRepository.js` redefinia `AgendamentoRepository` sem exportar `listarParaConflito`, provocando erro no cadastro por e-mail. `GradeV2_AgendamentoService.js` também redefinia `AgendamentoService`, podendo suprimir a confirmação por e-mail.
- Em ramificação de correção, foram removidos apenas esses dois arquivos legados duplicados; o histórico Git preserva seu conteúdo.
- Arquivos criados: nenhum. Alterados: `PROJECT_STATUS.md`. Mantidos: `AgendamentoRepository.js`, `AgendamentoService.js`, `AgendamentoRules.js`, `AgendamentoEmailService.js` e os demais arquivos. Excluídos na ramificação: `GradeV2_AgendamentoRepository.js` e `GradeV2_AgendamentoService.js`, por duplicação das responsabilidades já assumidas pelos arquivos canônicos.
- Validação estática: árvore da ramificação contém apenas um `AgendamentoRepository.js` e um `AgendamentoService.js`; nenhum teste real Gmail/Sheets foi executado.
- Próximo passo: revisar dependências, executar testes automatizados e teste controlado no Apps Script; só depois aprovar a integração à `main` e a publicação em produção.

## Integração Groq — preparação em ramificação (03/11/2026)
- Adicionados `AgendamentoGroqService.js` (API Groq, chave GROQ_API_KEY em Script Properties) e `AgendamentoEmailIAService.js` (leitura Gmail, correspondência com cadastros, validação, conflito e prevenção de duplicação).
- `index.html` recebeu botão independente `Ler E-mails com IA`; botão antigo mantido.
- Criado `AgendamentoGroq.test.cjs` e atualizado `.github/workflows/agendamento-tests.yml` para executar os testes.
- Mantidos os demais serviços, regras, validadores e repositórios. Nenhum arquivo excluído.
- O recurso ativa na primeira execução e só processa mensagens posteriores; compartilha a marca de e-mails processados com o botão original.
- Teste real depende da chave válida `GROQ_API_KEY`, permissões de UrlFetchApp/Gmail e execução autenticada no Apps Script. Não publicar em produção antes dos testes automatizados.

## Diagnóstico de falha Groq HTTP 404 — 03/11/2026
- Usuário confirmou na interface que a autorização de `UrlFetchApp.fetch` foi superada; chamada à Groq retornou HTTP 404. Nenhum agendamento cadastrado na tentativa.
- Alterado `AgendamentoGroqService.js`: quando a API devolve JSON com `error.message`, mostrar mensagem limitada a 350 caracteres, sem incluir chave, cabeçalhos ou corpo do e-mail. Em HTTP 404, orientar verificar `GROQ_MODEL` e disponibilidade do modelo.
- Alterado `AgendamentoGroq.test.cjs`: teste isolado do diagnóstico HTTP 404 sem vazamento da chave.
- Criados: nenhum. Mantidos: interface, repositórios, regras, validadores, serviços de e-mail e demais fontes. Excluídos: nenhum.
- Como testar: executar testes automatizados; depois clicar em `Ler E-mails com IA` e observar a mensagem retornada. Não foi realizada chamada real com a chave Groq nem gravação em Sheets nesta etapa.

## Correção automática de modelo Groq — 03/11/2026
- Ao receber HTTP 404 indicando modelo inexistente ou sem acesso, `AgendamentoGroqService.js` consulta `GET /openai/v1/models` usando a chave já armazenada, seleciona uma opção de texto reconhecida e tenta a extração uma única vez. Sem nova chave e sem alterar propriedades do script.
- Teste de fallback (modelo alternativo) acrescentado a `AgendamentoGroq.test.cjs`. Arquivos alterados: `AgendamentoGroqService.js`, `AgendamentoGroq.test.cjs`, `PROJECT_STATUS.md`. Arquivos criados/excluídos: nenhum. Demais arquivos mantidos.
- Testar com a execução automatizada; em seguida executar `Ler E-mails com IA` com mensagem controlada. Ainda não houve chamada real com a chave nem gravação real em Sheets nesta etapa.

## Diagnóstico de confirmação por e-mail — 03/11/2026
- Evidência: importação com IA cadastrou agendamento código 6, mas o retorno informou falha na confirmação. A causa exata não estava disponível na interface.
- Alterado `AgendamentoService.js` para distinguir falta de autorização MailApp, cota excedida e outras falhas, mantendo o cadastro persistido.
- Alterado `AgendamentoEmailEnvioService.js`: função manual `autorizarEmailConfirmacaoAgendamento()` consulta a cota MailApp sem enviar e-mail; requer consentimento do proprietário no Apps Script.
- Alterado `AgendamentoEmailEnvio.test.cjs`: testes isolados para autorização sem envio e erro que não marca confirmação como enviada.
- Criados: nenhum. Mantidos: interface, repositórios, regras, validadores e integração Groq. Excluídos: nenhum.
- Como testar: executar testes automatizados; no Apps Script executar manualmente `autorizarEmailConfirmacaoAgendamento` e aprovar permissões; cadastrar novo agendamento controlado e conferir a confirmação. O agendamento 6 não deve ser recriado para repetir o envio.

## Autopreenchimento de endereço pelo ViaCEP — 03/11/2026
- Na tela de Cliente, após digitar 8 números do CEP, a interface chama `consultarCepCliente()` no `ClienteService.js`, que consulta `https://viacep.com.br/ws/{CEP}/json/` com `UrlFetchApp` e devolve dados públicos do endereço.
- O campo endereço é preenchido quando retornado; cidade e bairro são selecionados somente se houver correspondência única com opções já cadastradas. Não cria cidade, bairro ou cliente; número permanece manual. CEP inválido/inexistente ou falha da API exibe aviso.
- Arquivos criados: `ClienteCep.test.cjs`. Alterados: `ClienteService.js`, `index.html`, `.github/workflows/agendamento-tests.yml`, `PROJECT_STATUS.md`. Mantidos: `ClienteRepository.js`, `ClienteValidator.js`, `ClienteRules.js`, demais arquivos e `PROJECT_GUIDE.md`. Excluídos: nenhum.
- Testes: executar `node ClienteCep.test.cjs` e fluxo de CI; testar no formulário CEP existente, inexistente, cidade/bairro não cadastrados e preenchimento manual. Sem gravação real de cliente nesta etapa.

## Correção da consulta ViaCEP na interface — 03/11/2026
- Identificado defeito em `index.html`: expressões regulares tinham barras invertidas duplicadas e não removiam o hífen do CEP nem separavam corretamente a cidade/UF, impedindo a busca e seleção automática.
- Corrigidas somente as expressões do fluxo Cliente em `index.html` e ampliado `ClienteCep.test.cjs` para testar CEP com hífen e cidade acentuada.
- Criados: nenhum. Alterados: `index.html`, `ClienteCep.test.cjs`, `PROJECT_STATUS.md`. Mantidos: `ClienteService.js`, `ClienteRepository.js`, `ClienteValidator.js`, `ClienteRules.js`, demais arquivos. Excluídos: nenhum.
- Como testar: executar o fluxo automatizado e, na aplicação publicada, informar `01001-000`; verificar endereço e seleção de cidade/bairro quando cadastrados. Nenhum cliente de teste foi salvo.

## ViaCEP — retorno visível na tela e consulta alternativa (03/11/2026)
- O CEP digitado agora exibe status diretamente sob o campo. A consulta tenta ViaCEP diretamente pelo navegador e usa `google.script.run` como alternativa quando a conexão externa falha.
- Endereço, cidade e bairro são preenchidos/selecionados somente com dados disponíveis e correspondência cadastrada. CEP de localidade sem rua/bairro exibe orientação para preenchimento manual; número do imóvel sempre manual.
- Criados: nenhum. Alterados: `index.html`, `ClienteCep.test.cjs`, `PROJECT_STATUS.md`. Mantidos: Services, Rules, Validators, Repositories, demais arquivos. Excluídos: nenhum.
- Testes: `node ClienteCep.test.cjs` simula interface preenchendo rua/cidade/bairro e CEP sem logradouro. Ainda requer confirmação visual no navegador do usuário; nenhuma planilha foi alterada.

## Botão Buscar CEP na tela de clientes — 03/11/2026
- Adicionado botão explícito `Buscar CEP`, tipo `button`, ao lado do campo CEP, para consultar mesmo quando a digitação/colagem não dispara o evento esperado. A busca pode ser repetida e mostra o resultado no formulário.
- Criados: nenhum. Alterados: `index.html`, `ClienteCep.test.cjs`, `PROJECT_STATUS.md`. Mantidos: `ClienteService.js`, `ClienteRepository.js`, `ClienteValidator.js`, `ClienteRules.js` e demais arquivos. Excluídos: nenhum.
- Testes: executar `node ClienteCep.test.cjs`; no navegador, informar CEP, clicar Buscar CEP e observar mensagem sob o campo. A integração real permanece dependente da resposta do ViaCEP e do navegador.
