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

/** Regressão da interface: hífen no CEP, acentos e UF da cidade. */
const html = fs.readFileSync("index.html", "utf8");
const trecho = html.slice(html.indexOf("function normalizarLocalidadeCliente("),
  html.indexOf("    /**\n     * Cadastro de cliente.", html.indexOf("function normalizarLocalidadeCliente(")));
const tela = {
  document: {
    getElementById: id => id === "cepCliente"
      ? {value: "01001-000"}
      : {options: [{value: "", textContent: "Selecione"}, {value: "12", textContent: "São Paulo - SP"}], value: ""}
  },
  google: {script: {run: {}}},
  mostrarMensagem: () => {}
};
vm.createContext(tela);
vm.runInContext(trecho, tela);
assert.equal(tela.normalizarLocalidadeCliente("São Paulo"), "SAOPAULO");
assert.equal(tela.selecionarLocalidadeCliente("cidadeCliente", "São Paulo", "SP"), true);
assert.equal(tela.document.getElementById("cepCliente").value.replace(/\D/g, "").length, 8);
assert.match(trecho, /replace\(\/\\D\/g/);
console.log("OK: interface aceita CEP com hífen e cidade com acento.");

/** Simula o navegador para verificar o fluxo de CEP até o campo endereço. */
(async function testarFormularioCep() {
  const htmlAtual = fs.readFileSync("index.html", "utf8");
  const inicio = htmlAtual.indexOf("function normalizarLocalidadeCliente(");
  const fim = htmlAtual.indexOf("    /**\n     * Cadastro de cliente.", inicio);
  const campos = {
    cepCliente: {value: "01001-000"},
    enderecoCliente: {value: ""},
    cidadeCliente: {value: "", options: [{value:"",textContent:"Selecione"}, {value:"5",textContent:"São Paulo - SP"}]},
    bairroCliente: {value: "", options: [{value:"",textContent:"Selecione"}, {value:"7",textContent:"Sé"}]},
    situacaoCepCliente: {textContent: ""},
    btnBuscarCepCliente: {disabled: false}
  };
  let resolver;
  const telaReal = {
    document: {getElementById: id => campos[id]},
    fetch: () => Promise.resolve({ok:true,json:() => Promise.resolve({
      cep:"01001-000",logradouro:"Praça da Sé",bairro:"Sé",localidade:"São Paulo",uf:"SP"
    })}),
    google: {script:{run:{}}},
    mostrarMensagem: () => {}
  };
  vm.createContext(telaReal);
  vm.runInContext(htmlAtual.slice(inicio, fim), telaReal);
  assert.match(htmlAtual, /id="btnBuscarCepCliente"/);
  telaReal.consultarCepClienteTela(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(campos.enderecoCliente.value, "Praça da Sé");
  assert.equal(campos.cidadeCliente.value, "5");
  assert.equal(campos.bairroCliente.value, "7");
  assert.match(campos.situacaoCepCliente.textContent, /Endereço preenchido/);
  assert.equal(campos.btnBuscarCepCliente.disabled, false);
  campos.cepCliente.value = "79140-000";
  telaReal.fetch = () => Promise.resolve({ok:true,json:() => Promise.resolve({
    cep:"79140-000",logradouro:"",bairro:"",localidade:"Terenos",uf:"MS"
  })});
  telaReal.consultarCepClienteTela();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(campos.situacaoCepCliente.textContent, /não informa a rua/);
  console.log("OK: interface preenche rua, cidade e bairro; CEP sem rua exibe aviso.");
})().catch(erro => {console.error(erro); process.exitCode = 1;});
