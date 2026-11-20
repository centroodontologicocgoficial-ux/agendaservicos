/**
 * Entidade: Agendamento
 * Responsabilidade: teste isolado do cadastro manual e conflitos.
 * Dependências: Node.js, assert, fs e vm. Não acessa planilhas reais.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const registros = [];
let bloqueado = false;
let confirmacoes = 0;
const contexto = {
  LockService: {getScriptLock: () => ({
    tryLock: () => { if (bloqueado) return false; bloqueado = true; return true; },
    releaseLock: () => { bloqueado = false; }
  })},
  AgendamentoValidator: {validarCadastro: () => {}},
  AgendamentoRepository: {
    buscarFuncionarioPorCodigo: () => ({codigo:"1",nome:"Profissional"}),
    buscarClientePorCodigo: () => ({codigo:"1",nome:"Cliente"}),
    buscarServicoPorCodigo: () => ({codigo:"1",nome:"Serviço",tempo:60,valor:100}),
    listarParaConflito: () => registros.map(x => ({
      data:"2026-11-20",hora:x.hora,codigoFuncionario:"1",codigoServico:"1",status:"AGENDADO"
    })),
    listarServicos: () => [{codigo:"1",tempo:60}],
    salvar: ag => {registros.push(ag); return registros.length;}
  },
  AgendamentoEmailEnvioService: {confirmar: () => {confirmacoes++; return "enviado";}},
  console
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync("AgendamentoRules.js","utf8"), contexto);
vm.runInContext(fs.readFileSync("AgendamentoService.js","utf8"), contexto);
const dados = hora => ({
  data:"2026-11-20",hora,codigo_funcionario:"1",
  codigo_cliente:"1",codigo_servico:"1",status:"AGENDADO"
});
assert.match(contexto.AgendamentoService.cadastrar(dados("09:00")), /sucesso/);
assert.throws(() => contexto.AgendamentoService.cadastrar(dados("09:30")), /Conflito de horário/);
assert.equal(registros.length, 1);
assert.match(contexto.AgendamentoService.cadastrar(dados("10:00")), /sucesso/);
assert.equal(registros.length, 2);
assert.equal(confirmacoes, 2);
assert.equal(bloqueado, false);
console.log("OK: conflito rejeitado, horários adjacentes aceitos, trava liberada.");
