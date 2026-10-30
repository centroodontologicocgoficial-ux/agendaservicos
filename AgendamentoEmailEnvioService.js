/**
 * Entidade: Agendamento
 * Camada: Service — envio de notificações por e-mail
 *
 * Responsabilidade: enviar confirmação e lembrete ao e-mail cadastrado
 * do cliente, sem acessar Google Sheets diretamente.
 * Dependências: AgendamentoRepository, MailApp, PropertiesService,
 * LockService e Session.
 *
 * O lembrete é enviado quando executar verificarLembretesAgendamento().
 * Para execução diária, habilite o gatilho explicitamente no Apps Script.
 */
var AgendamentoEmailEnvioService = (function () {
  var PREFIXO_CONFIRMACAO = "agenda_confirmacao_";
  var PREFIXO_LEMBRETE = "agenda_lembrete_";
  var HORAS_ANTECEDENCIA = 24;

  /**
   * Confere se o endereço do cliente tem formato básico de e-mail.
   * @param {string} endereco Endereço cadastrado.
   * @return {boolean} Verdadeiro quando o endereço é utilizável.
   */
  function emailValido_(endereco) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(endereco || "").trim());
  }

  /**
   * Envia uma notificação uma única vez por chave.
   * @param {string} chave Identificador persistente do envio.
   * @param {Object} mensagem Destinatário, assunto e corpo.
   * @return {string} Situação do envio.
   */
  function enviarUmaVez_(chave, mensagem) {
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(10000)) throw new Error("Envio em andamento. Tente novamente.");
    try {
      var propriedades = PropertiesService.getScriptProperties();
      if (propriedades.getProperty(chave)) return "já enviado";
      MailApp.sendEmail({
        to: mensagem.para,
        subject: mensagem.assunto,
        body: mensagem.corpo,
        name: "Agenda de Serviços"
      });
      propriedades.setProperty(chave, new Date().toISOString());
      return "enviado";
    } finally {
      trava.releaseLock();
    }
  }

  /**
   * Formata a descrição sem utilizar conteúdo HTML nem confiar no remetente.
   * @param {Object} agendamento Dados do compromisso.
   * @param {Object} cliente Cliente com nome e e-mail.
   * @param {Object} servico Serviço cadastrado.
   * @param {Object} profissional Profissional cadastrado.
   * @return {string} Texto do e-mail.
   */
  function descricao_(agendamento, cliente, servico, profissional) {
    return "Olá, " + cliente.nome + "!\n\n" +
      "Serviço: " + servico.nome + "\n" +
      "Profissional: " + profissional.nome + "\n" +
      "Data: " + agendamento.data + "\n" +
      "Hora: " + agendamento.hora + "\n\n" +
      "Em caso de dúvidas, entre em contato com o estabelecimento.\n" +
      "Agenda de Serviços";
  }

  /**
   * Resolve contatos e referências do agendamento.
   * @param {Object} agendamento Dados com códigos do cliente, serviço e funcionário.
   * @return {Object|null} Informações necessárias, ou null se não houver e-mail.
   */
  function preparar_(agendamento) {
    var cliente = AgendamentoRepository.buscarContatoCliente(agendamento.codigoCliente);
    if (!cliente || !emailValido_(cliente.email)) return null;
    var servico = AgendamentoRepository.buscarServicoPorCodigo(agendamento.codigoServico);
    var profissional = AgendamentoRepository.buscarFuncionarioPorCodigo(agendamento.codigoFuncionario);
    if (!servico || !profissional) throw new Error("Referências do agendamento não encontradas.");
    return {cliente: cliente, servico: servico, profissional: profissional};
  }

  /**
   * Envia confirmação do agendamento já salvo, sem modificar a planilha.
   * @param {Object} agendamento Dados com código e data no formato AAAA-MM-DD.
   * @return {string} Situação do envio.
   */
  function confirmar(agendamento) {
    if (agendamento.status === "CANCELADO") return "cancelado";
    var contato = preparar_(agendamento);
    if (!contato) return "cliente sem e-mail válido";
    return enviarUmaVez_(PREFIXO_CONFIRMACAO + agendamento.codigo, {
      para: contato.cliente.email,
      assunto: "Confirmação de agendamento",
      corpo: "Seu agendamento foi registrado.\n\n" +
        descricao_(agendamento, contato.cliente, contato.servico, contato.profissional)
    });
  }

  /**
   * Converte data e hora da planilha para instante local do projeto.
   * @param {Object} agendamento Dados com data AAAA-MM-DD e hora HH:MM.
   * @return {Date} Data do compromisso.
   */
  function instante_(agendamento) {
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(agendamento.data);
    var h = /^(\d{2}):(\d{2})$/.exec(agendamento.hora);
    if (!d || !h) throw new Error("Data ou hora de agendamento inválida.");
    var instante = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]),
      Number(h[1]), Number(h[2]));
    if (instante.getFullYear() !== Number(d[1]) ||
        instante.getMonth() !== Number(d[2]) - 1 ||
        instante.getDate() !== Number(d[3]) ||
        instante.getHours() !== Number(h[1]) ||
        instante.getMinutes() !== Number(h[2])) {
      throw new Error("Data ou hora de agendamento inválida.");
    }
    return instante;
  }

  /**
   * Envia lembretes dos próximos 24h para agendamentos ativos.
   * Deve ser acionada por execução manual ou gatilho diário autorizado.
   * @return {Object} Resumo dos lembretes.
   */
  function verificarLembretes() {
    var agora = new Date();
    var resumo = {enviados: 0, ignorados: 0, erros: []};
    AgendamentoRepository.listarParaLembretes().forEach(function (agendamento) {
      if (agendamento.status !== "AGENDADO" && agendamento.status !== "CONFIRMADO") {
        resumo.ignorados++;
        return;
      }
      try {
        var intervalo = instante_(agendamento).getTime() - agora.getTime();
        if (intervalo <= 0 || intervalo > HORAS_ANTECEDENCIA * 3600000) {
          resumo.ignorados++;
          return;
        }
        var contato = preparar_(agendamento);
        if (!contato) { resumo.ignorados++; return; }
        var situacao = enviarUmaVez_(
          PREFIXO_LEMBRETE + agendamento.codigo + "_" + agendamento.data + "_" + agendamento.hora,
          {para: contato.cliente.email,
            assunto: "Lembrete de agendamento",
            corpo: "Lembramos seu próximo atendimento.\n\n" +
              descricao_(agendamento, contato.cliente, contato.servico, contato.profissional)}
        );
        if (situacao === "enviado") resumo.enviados++;
        else resumo.ignorados++;
      } catch (erro) {
        resumo.erros.push("Agendamento " + agendamento.codigo + ": " + erro.message);
      }
    });
    return resumo;
  }

  return {confirmar: confirmar, verificarLembretes: verificarLembretes};
})();

/**
 * Ponto de entrada para executar lembretes manualmente ou por gatilho.
 * @return {Object} Resultado do processamento.
 */
function verificarLembretesAgendamento() {
  return AgendamentoEmailEnvioService.verificarLembretes();
}
