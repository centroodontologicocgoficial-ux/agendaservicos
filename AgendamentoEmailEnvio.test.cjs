/**
 * Testes automatizados da entidade Agendamento — execução Node.js.
 * Simula MailApp, planilha e propriedades sem enviar e-mails reais.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const arquivos = ['AgendamentoEmailEnvioService.js', 'AgendamentoEmailService.js'];
const envios = [];
const estado = new Map();
const propriedades = {
  getProperty: k => estado.get(k) || null,
  setProperty: (k, v) => { estado.set(k, v); }
};
let registros = [];
let mensagens = [];
let cadastros = 0;
const contexto = {
  console, Date, Number, String, Error, Object, Array, RegExp, isFinite,
  MailApp: {sendEmail: msg => envios.push(msg)},
  PropertiesService: {getScriptProperties: () => propriedades},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => {}})},
  Session: {getScriptTimeZone: () => 'America/Cuiaba'},
  Utilities: {formatDate: () => '2026/10/28'},
  GmailApp: {search: () => [{getMessages: () => mensagens}]},
  AgendamentoRepository: {
    buscarContatoCliente: () => ({nome: 'Ana', email: 'ana@example.com'}),
    buscarServicoPorCodigo: () => ({codigo: '1', nome: 'Corte', tempo: 30}),
    buscarFuncionarioPorCodigo: () => ({codigo: '2', nome: 'Bia'}),
    listarParaLembretes: () => registros,
    listarClientes: () => [{codigo: '3', nome: 'Ana'}],
    listarFuncionarios: () => [{codigo: '2', nome: 'Bia'}],
    listarServicos: () => [{codigo: '1', nome: 'Corte', tempo: 30}],
    listarParaConflito: () => []
  },
  AgendamentoValidator: {validarCadastro: () => {}},
  AgendamentoRules: {validarDisponibilidadeEmail: () => {}},
  AgendamentoService: {cadastrar: () => {cadastros++; return 'ok';}}
};
vm.createContext(contexto);
arquivos.forEach(arquivo => vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto, {filename: arquivo}));

const base = {codigo: '7', data: '2026-10-30', hora: '14:00',
  codigoCliente: '3', codigoFuncionario: '2', codigoServico: '1', status: 'AGENDADO'};
assert.equal(contexto.AgendamentoEmailEnvioService.confirmar(base), 'enviado');
assert.equal(contexto.AgendamentoEmailEnvioService.confirmar(base), 'já enviado');
assert.equal(envios.length, 1, 'confirmação não pode duplicar');
assert.match(envios[0].body, /Corte/);

// Primeira verificação apenas registra a ativação; nenhuma mensagem antiga é processada.
mensagens = [{getSubject: () => 'Agendamento', getDate: () => new Date(0),
  getId: () => 'antiga', getPlainBody: () => 'Cliente: Ana\\nServiço: Corte\\nProfissional: Bia\\nData: 2026-10-30\\nHora: 14:00'}];
const ativacao = contexto.verificarEmailsAgendamento();
assert.equal(ativacao.ativadoAgora, true);
assert.equal(cadastros, 0);
const segunda = contexto.verificarEmailsAgendamento();
assert.equal(segunda.cadastrados, 0);
assert.equal(cadastros, 0);

// O lembrete não envia para compromissos cancelados.
registros = [{...base, status: 'CANCELADO'}];
const lembretes = contexto.verificarLembretesAgendamento();
assert.equal(lembretes.enviados, 0);
assert.equal(envios.length, 1);
console.log('OK: confirmação única, ativação segura, e-mail antigo ignorado e cancelamento respeitado.');
