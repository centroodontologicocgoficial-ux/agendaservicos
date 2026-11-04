/** Testes isolados do fluxo Groq, sem chamadas externas ou gravação real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const propriedades = new Map([['GROQ_API_KEY', 'chave-simulada']]);
const msgs = [];
let gravados = 0, chamadas = 0;
const agora = new Date();
const contexto = {
  Date, String, Number, Object, Array, RegExp, JSON, Error, isFinite,
  PropertiesService: {getScriptProperties: () => ({
    getProperty: k => propriedades.get(k) || null,
    setProperty: (k,v) => propriedades.set(k,v)
  })},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => {}})},
  Session: {getScriptTimeZone: () => 'America/Cuiaba'},
  Utilities: {formatDate: () => '2026/11/03'},
  GmailApp: {search: () => [{getMessages: () => msgs}]},
  UrlFetchApp: {fetch: (_url, options) => {
    chamadas++;
    assert.match(options.headers.Authorization, /^Bearer /);
    return {getResponseCode: () => 200, getContentText: () => JSON.stringify({
      choices: [{message: {content: JSON.stringify({
        cliente: 'Ana', servico: 'Corte', profissional: 'Bia',
        data: '2026-11-10', hora: '14:00'
      })}}]
    })};
  }},
  AgendamentoRepository: {
    listarClientes: () => [{codigo: '1', nome: 'Ana'}],
    listarFuncionarios: () => [{codigo: '2', nome: 'Bia'}],
    listarServicos: () => [{codigo: '3', nome: 'Corte', tempo: 30}],
    listarParaConflito: () => []
  },
  AgendamentoValidator: {validarCadastro: dados => assert.equal(dados.data, '2026-11-10')},
  AgendamentoRules: {validarDisponibilidadeEmail: () => {}},
  AgendamentoService: {cadastrar: () => {gravados++; return 'cadastrado';}}
};
vm.createContext(contexto);
['AgendamentoGroqService.js', 'AgendamentoEmailIAService.js'].forEach(p =>
  vm.runInContext(fs.readFileSync(p, 'utf8'), contexto, {filename:p}));
assert.equal(contexto.verificarEmailsAgendamentoIA().ativadoAgora, true);
msgs.push({getSubject: () => 'AGENDAMENTO', getDate: () => new Date(Date.now()+1000),
  getId: () => 'email-teste', getPlainBody: () => 'Quero um corte com Bia para Ana.'});
const primeiro = contexto.verificarEmailsAgendamentoIA();
assert.equal(primeiro.cadastrados, 1);
assert.equal(gravados, 1);
const segundo = contexto.verificarEmailsAgendamentoIA();
assert.equal(segundo.ignorados, 1);
assert.equal(gravados, 1);
assert.equal(chamadas, 1);
console.log('OK: ativação, interpretação, cadastro e prevenção de duplicação.');

/** Erros HTTP expõem somente a mensagem devolvida pela API, sem credenciais. */
const respostaOriginal = contexto.UrlFetchApp.fetch;
contexto.UrlFetchApp.fetch = () => ({
  getResponseCode: () => 404,
  getContentText: () => JSON.stringify({error: {message: 'model_not_found: modelo indisponível'}})
});
assert.throws(
  () => contexto.AgendamentoGroqService.extrairAgendamento('Agendamento de teste'),
  erro => erro.message.includes('HTTP 404') &&
    erro.message.includes('modelo indisponível') &&
    !erro.message.includes('chave-simulada')
);
contexto.UrlFetchApp.fetch = respostaOriginal;
console.log('OK: erro HTTP 404 apresenta motivo sem revelar a chave.');

/** Em HTTP 404 por modelo, busca opções da própria conta e tenta uma vez. */
let consultas = [];
contexto.UrlFetchApp.fetch = (url, options) => {
  if (url.endsWith('/models')) {
    consultas.push('models');
    return {getResponseCode: () => 200, getContentText: () =>
      JSON.stringify({data: [{id: 'llama-3.1-8b-instant', active: true}]})};
  }
  const modelo = JSON.parse(options.payload).model;
  consultas.push(modelo);
  if (modelo === 'llama-3.3-70b-versatile') {
    return {getResponseCode: () => 404, getContentText: () =>
      JSON.stringify({error: {message: 'model not found'}})};
  }
  return {getResponseCode: () => 200, getContentText: () =>
    JSON.stringify({choices: [{message: {content: JSON.stringify({
      cliente: 'Ana', servico: 'Corte', profissional: 'Bia',
      data: '2026-11-10', hora: '14:00'
    })}}]})};
};
const extraido = contexto.AgendamentoGroqService.extrairAgendamento('Solicitação de teste');
assert.equal(extraido.cliente, 'Ana');
assert.deepEqual(consultas, ['llama-3.3-70b-versatile', 'models', 'llama-3.1-8b-instant']);
console.log('OK: modelo indisponível substituído por modelo listado na conta.');
