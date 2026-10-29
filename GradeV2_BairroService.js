/**
 * Entidade: Bairro
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar o caso de uso de cadastro de bairro, delegando a validação ao
 * Validator e a persistência ao Repository.
 *
 * Dependências principais:
 * - BairroValidator
 * - BairroRepository
 */
var BairroService = (function() {
  /**
   * Cadastra um bairro após validar e normalizar o nome.
   *
   * @param {string} nome Nome recebido da interface.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando os dados são inválidos ou a gravação falha.
   */
  function cadastrar(nome) {
    var nomeValidado = BairroValidator.validarCadastro(nome);
    var codigo = BairroRepository.salvar(nomeValidado);

    return "Bairro cadastrado com sucesso! Código: " + codigo;
  }


  /** Lista os registros cadastrados para a grade da interface. @return {Object[]} */
  function listarParaGrade() {
    return BairroRepository.listarParaGrade();
  }
  return {
    listarParaGrade: listarParaGrade,
    cadastrar: cadastrar
  };
})();

/**
 * Ponto de entrada público mantido para compatibilidade com index.html.
 *
 * @param {string} nome Nome do bairro informado pela interface.
 * @return {string} Mensagem de sucesso do cadastro.
 */
function cadastrarBairro(nome) {
  return BairroService.cadastrar(nome);
}

/** Consulta pública usada pela grade do cadastro de Bairro. @return {Object[]} */
function listarBairroGrade() {
  return BairroService.listarParaGrade();
}
