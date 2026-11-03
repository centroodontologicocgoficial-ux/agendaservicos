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
