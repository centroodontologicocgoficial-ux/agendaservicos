/**
 * Entidade: Cliente
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar o caso de uso de cadastro de cliente e as consultas necessárias
 * às listas de cidades e bairros, sem acessar diretamente o Google Sheets.
 *
 * Dependências principais:
 * - ClienteValidator
 * - ClienteRules
 * - ClienteRepository
 */
var ClienteService = (function() {

  /**
   * Retorna cidades para a lista suspensa do formulário.
   *
   * @return {Object[]} Cidades cadastradas.
   */
  function listarCidades() {
    return ClienteRepository.listarCidades();
  }

  /**
   * Retorna bairros para a lista suspensa do formulário.
   *
   * @return {Object[]} Bairros cadastrados.
   */
  function listarBairros() {
    return ClienteRepository.listarBairros();
  }

  /**
   * Executa o caso de uso "Cadastrar Cliente".
   *
   * Fluxo:
   * 1. valida e normaliza os dados recebidos;
   * 2. consulta cidade e bairro no Repository;
   * 3. aplica as regras de negócio;
   * 4. solicita ao Repository a gravação do cliente;
   * 5. devolve a mensagem de sucesso mantendo o contrato da interface.
   *
   * @param {Object} dados Dados recebidos do formulário.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando dados ou referências são inválidos.
   */
  function cadastrar(dados) {
    var cliente = ClienteValidator.validarCadastro(dados);

    var cidade = ClienteRepository.buscarCidadePorCodigo(cliente.codigo_cidade);
    var bairro = ClienteRepository.buscarBairroPorCodigo(cliente.codigo_bairro);

    ClienteRules.validarReferencias(cliente, cidade, bairro);

    var codigo = ClienteRepository.salvar(cliente);
    return "Cliente cadastrado com sucesso! Código: " + codigo;
  }


  /**
   * Consulta o endereço público associado a um CEP no ViaCEP.
   * Não grava dados e não altera cadastros de cidades ou bairros.
   * @param {string} cep CEP informado no formulário.
   * @return {Object} Logradouro, bairro, localidade, UF e CEP normalizado.
   * @throws {Error} CEP inválido, não encontrado ou falha de comunicação.
   */
  function consultarCep(cep) {
    var digitos = String(cep || "").replace(/\\D/g, "");
    if (!/^\\d{8}$/.test(digitos)) {
      throw new Error("Informe um CEP com 8 números.");
    }
    var resposta = UrlFetchApp.fetch("https://viacep.com.br/ws/" + digitos + "/json/", {
      muteHttpExceptions: true,
      followRedirects: false
    });
    if (resposta.getResponseCode() !== 200) {
      throw new Error("Não foi possível consultar o ViaCEP. Tente novamente.");
    }
    var dados;
    try { dados = JSON.parse(resposta.getContentText()); }
    catch (erro) { throw new Error("Resposta inválida do ViaCEP."); }
    if (!dados || dados.erro === true || !dados.cep) {
      throw new Error("CEP não encontrado no ViaCEP.");
    }
    return {
      cep: String(dados.cep),
      endereco: String(dados.logradouro || ""),
      bairro: String(dados.bairro || ""),
      cidade: String(dados.localidade || ""),
      uf: String(dados.uf || "")
    };
  }

  /** Lista os registros cadastrados para a grade da interface. @return {Object[]} */
  function listarParaGrade() {
    return ClienteRepository.listarParaGrade();
  }
  return {
    listarParaGrade: listarParaGrade,
    listarCidades: listarCidades,
    listarBairros: listarBairros,
    cadastrar: cadastrar,
    consultarCep: consultarCep
  };

})();


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run utilizado pelo index.html.
 *
 * @return {Object[]} Cidades disponíveis para seleção.
 */
function listarCidadesSelecao() {
  return ClienteService.listarCidades();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run utilizado pelo index.html.
 *
 * @return {Object[]} Bairros disponíveis para seleção.
 */
function listarBairrosSelecao() {
  return ClienteService.listarBairros();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o nome original chamado pelo index.html.
 *
 * @param {Object} dados Dados do formulário de cliente.
 * @return {string} Mensagem de sucesso.
 */
function cadastrarCliente(dados) {
  return ClienteService.cadastrar(dados);
}

/** Consulta pública usada pela grade do cadastro de Cliente. @return {Object[]} */
function listarClienteGrade() {
  return ClienteService.listarParaGrade();
}

/**
 * Ponto de entrada para consulta do CEP no formulário de clientes.
 * @param {string} cep CEP informado.
 * @return {Object} Endereço público retornado pelo ViaCEP.
 */
function consultarCepCliente(cep) {
  return ClienteService.consultarCep(cep);
}
