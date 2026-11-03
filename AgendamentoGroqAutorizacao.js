/**
 * Entidade: Agendamento
 * Responsabilidade: solicitar autorização de acesso externo à API Groq.
 *
 * Execute manualmente no editor do Google Apps Script, com a conta
 * proprietária da implantação. Não envia chave nem dados de clientes.
 * A função pode ser removida após a autorização.
 *
 * @return {number} Código HTTP retornado pelo servidor Groq.
 */
function autorizarGroq() {
  var resposta = UrlFetchApp.fetch("https://api.groq.com", {
    muteHttpExceptions: true
  });
  var codigo = resposta.getResponseCode();
  Logger.log("Acesso externo autorizado; HTTP " + codigo);
  return codigo;
}
