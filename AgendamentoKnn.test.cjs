/**
 * Entidade: Agendamento
 * Responsabilidade: testar KNN sem planilha ou dados de pacientes reais.
 * Executar: node AgendamentoKnn.test.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const contexto = {};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync("AgendamentoKnnRules.js", "utf8"), contexto);
const knn = contexto.AgendamentoKnnRules;
const exemplo = (status, hora, cliente) => ({
  data: "20/11/2026", hora: hora, codigoCliente: cliente,
  codigoFuncionario: "1", codigoServico: "1", status: status
});
assert.equal(knn.prever(exemplo("AGENDADO", "09:00", "1"), []), null);
const historico = Array.from({length: 30}, (_, i) =>
  exemplo(i < 7 ? "FALTOU" : "COMPARECEU", i < 7 ? "09:00" : "17:00", i < 7 ? "1" : "2"));
assert.equal(knn.prever(exemplo("AGENDADO", "09:00", "1"), historico), 100);
assert.equal(knn.prever(exemplo("AGENDADO", "17:00", "2"), historico), 0);
assert.equal(knn.prever(exemplo("AGENDADO", "09:00", "1"), historico.concat([exemplo("AGENDADO", "09:00", "1")])), 100);
console.log("KNN: 4 verificações aprovadas");
