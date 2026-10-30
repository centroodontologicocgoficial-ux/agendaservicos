/**
 * Entidade: Agendamento
 * Camada: Service — Camada de Serviço
 *
 * Responsabilidade:
 * Coordenar os casos de uso da Agenda de Atendimento.
 *
 * Dependências principais:
 * - AgendamentoValidator
 * - AgendamentoRules
 * - AgendamentoRepository
 *
 * O Service não acessa diretamente o Google Sheets.
 */
var AgendamentoService = (function() {

  /**
   * Retorna funcionários para a lista suspensa da Agenda.
   *
   * @return {Object[]} Funcionários disponíveis.
   */
  function listarFuncionarios() {
    return AgendamentoRepository.listarFuncionarios();
  }


  /**
   * Retorna clientes para a lista suspensa da Agenda.
   *
   * @return {Object[]} Clientes disponíveis.
   */
  function listarClientes() {
    return AgendamentoRepository.listarClientes();
  }


  /**
   * Retorna serviços para a lista suspensa da Agenda.
   *
   * @return {Object[]} Serviços disponíveis.
   */
  function listarServicos() {
    return AgendamentoRepository.listarServicos();
  }


  /**
   * Executa o caso de uso "Cadastrar Agendamento".
   *
   * Fluxo:
   * 1. valida dados de entrada;
   * 2. normaliza os dados;
   * 3. aplica regras de negócio;
   * 4. consulta as referências necessárias;
   * 5. monta os dados de persistência;
   * 6. solicita a gravação ao Repository.
   *
   * @param {Object} dados Dados recebidos da interface.
   * @return {string} Mensagem de sucesso com o código criado.
   * @throws {Error} Quando qualquer validação ou regra falhar.
   */
  function cadastrar(dados) {
    AgendamentoValidator.validarCadastro(dados);

    var dataTexto = String(dados.data).trim();
    var horaTexto = String(dados.hora).trim();
    var codigoFuncionario = String(dados.codigo_funcionario).trim();
    var codigoCliente = String(dados.codigo_cliente).trim();
    var codigoServico = String(dados.codigo_servico).trim();
    var status = AgendamentoRules.normalizarStatus(dados.status);

    AgendamentoRules.validarStatus(status);

    var funcionario = AgendamentoRepository
      .buscarFuncionarioPorCodigo(codigoFuncionario);

    var cliente = AgendamentoRepository
      .buscarClientePorCodigo(codigoCliente);

    var servico = AgendamentoRepository
      .buscarServicoPorCodigo(codigoServico);

    AgendamentoRules.validarReferencias(
      funcionario,
      cliente,
      servico
    );

    var agendamento = {
      data: AgendamentoRules.criarDataPlanilha(dataTexto),
      hora: horaTexto,
      codigoFuncionario: Number(codigoFuncionario),
      codigoCliente: Number(codigoCliente),
      codigoServico: Number(codigoServico),

      // Regra preservada do código original:
      // o valor vem do cadastro do serviço, e não do formulário.
      valor: AgendamentoRules.obterValorServico(servico),

      status: status
    };

    var codigoAgendamento = AgendamentoRepository.salvar(agendamento);

    // O registro já foi persistido: falha no e-mail não desfaz o cadastro.
    var notificacao = "";
    try {
      notificacao = AgendamentoEmailEnvioService.confirmar({
        codigo: codigoAgendamento,
        data: dataTexto,
        hora: horaTexto,
        codigoFuncionario: codigoFuncionario,
        codigoCliente: codigoCliente,
        codigoServico: codigoServico,
        status: status
      });
    } catch (erroEnvio) {
      notificacao = "falha no envio da confirmação";
      console.error("Agendamento " + codigoAgendamento + ": " + erroEnvio.message);
    }
    return "Agendamento cadastrado com sucesso! Código: " +
      codigoAgendamento + ". E-mail: " + notificacao + ".";
  }



  /** Lista os registros cadastrados para a grade da interface. @return {Object[]} */
  function listarParaGrade() {
    return AgendamentoRepository.listarParaGrade();
  }
  return {
    listarParaGrade: listarParaGrade,
    listarFuncionarios: listarFuncionarios,
    listarClientes: listarClientes,
    listarServicos: listarServicos,
    cadastrar: cadastrar
  };

})();


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o mesmo nome utilizado pelo index.html antes da refatoração.
 * Dessa forma, o frontend não precisa ser alterado.
 *
 * @return {Object[]} Funcionários disponíveis para a Agenda.
 */
function listarFuncionariosAgenda() {
  return AgendamentoService.listarFuncionarios();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run existente no index.html.
 *
 * @return {Object[]} Clientes disponíveis para a Agenda.
 */
function listarClientesAgenda() {
  return AgendamentoService.listarClientes();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém compatibilidade com o google.script.run existente no index.html.
 *
 * @return {Object[]} Serviços disponíveis para a Agenda.
 */
function listarServicosAgenda() {
  return AgendamentoService.listarServicos();
}


/**
 * PONTO DE ENTRADA DA INTERFACE
 *
 * Mantém o nome original chamado pelo frontend.
 *
 * @param {Object} dados Dados do formulário de agendamento.
 * @return {string} Mensagem de sucesso.
 */
function cadastrarAgendamento(dados) {
  return AgendamentoService.cadastrar(dados);
}

/** Consulta pública usada pela grade do cadastro de Agendamento. @return {Object[]} */
function listarAgendamentoGrade() {
  return AgendamentoService.listarParaGrade();
}
