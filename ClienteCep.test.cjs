/**
 * Testes da entidade Cliente: consulta de CEP sem gravar no Google Sheets.
 * Executar com Node.js. Respostas externas são simuladas.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let chamadas = 0;
const contexto = {
  UrlFetchApp: {
    fetch(url) {
      chamadas++;
      assert.equal(url, "https://viacep.com.br/ws/01001000/json/");
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          cep: "01001-000", logradouro: "Praça da Sé",
          bairro: "Sé", localidade: "São Paulo", uf: "SP"
        })
      };
    }
  },
  ClienteRepository: {}, ClienteValidator: {}, ClienteRules: {}
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync("ClienteService.js", "utf8"), contexto);
assert.throws(() => contexto.consultarCepCliente("123"), /8 números/);
assert.equal(chamadas, 0);
const resultado = contexto.consultarCepCliente("01001-000");
assert.equal(resultado.endereco, "Praça da Sé");
assert.equal(resultado.cidade, "São Paulo");
assert.equal(resultado.bairro, "Sé");
assert.equal(chamadas, 1);
contexto.UrlFetchApp.fetch = () => ({
  getResponseCode: () => 200,
  getContentText: () => '{"erro":true}'
});
assert.throws(() => contexto.consultarCepCliente("01001000"), /não encontrado/);
console.log("OK: CEP válido, inválido e inexistente.");
