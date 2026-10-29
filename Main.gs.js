/**
 * Projeto: Agenda de Serviços
 * Responsabilidade: ponto de entrada do Web App.
 *
 * Objetivo:
 * Manter apenas responsabilidades globais da aplicação. Os casos de uso
 * das entidades ficam nos respectivos arquivos Service, Validator/Rules
 * e Repository, conforme a arquitetura definida no PROJECT_GUIDE.md.
 *
 * Dependências principais:
 * - HtmlService do Google Apps Script.
 */

/**
 * Entrega a interface principal do Web App.
 *
 * @return {GoogleAppsScript.HTML.HtmlOutput} Página principal da aplicação.
 */
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Agenda de Atendimento - Serviços");
}
