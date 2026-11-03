/**
 * Entidade: Agendamento
 * Camada: Service — leitura de e-mails assistida por IA.
 * Responsabilidade: coordenar Gmail, Groq, validação, conflitos e cadastro.
 * Dependências: GmailApp, AgendamentoGroqService, AgendamentoRepository,
 * AgendamentoValidator, AgendamentoRules e AgendamentoService.
 * Não acessa diretamente o Google Sheets.
 */
var AgendamentoEmailIAService = (function () {
  var PREFIXO_PROCESSADO = "agenda_email_processado_";
  var CHAVE_ATIVACAO = "agenda_email_ia_ativacao_em";
  var LIMITE_CONVERSAS = 100;

  /** Compara nomes cadastrados ignorando acentos e diferenças de caixa. */
  function normalizarNome_(valor) {
    return String(valor || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  /** Exige uma correspondência única no cadastro existente. */
  function localizarUnico_(nome, itens, entidade) {
    var encontrados = itens.filter(function (item) {
      return normalizarNome_(item.nome) === normalizarNome_(nome);
    });
    if (encontrados.length !== 1) {
      throw new Error(entidade + ": " + (encontrados.length ? "nome ambíguo" : "não encontrado") + ".");
    }
    return encontrados[0];
  }

  /**
   * Verifica mensagens novas e cadastra apenas dados validados.
   * Usa a mesma marca de processamento do botão antigo para impedir duplicações.
   * @return {Object} Resumo e relatório individual.
   */
  function verificar() {
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(10000)) throw new Error("Outra verificação está em andamento.");
    try {
      var propriedades = PropertiesService.getScriptProperties();
      if (!propriedades.getProperty("GROQ_API_KEY")) {
        throw new Error("Configure GROQ_API_KEY nas propriedades do Apps Script.");
      }
      var resumo = {cadastrados: 0, ignorados: 0, rejeitados: 0, mensagens: [], detalhes: []};
      var ativacao = propriedades.getProperty(CHAVE_ATIVACAO);
      if (!ativacao) {
        propriedades.setProperty(CHAVE_ATIVACAO, String(Date.now()));
        resumo.ativadoAgora = true;
        resumo.detalhes.push("Leitura com IA ativada. Apenas novos e-mails serão considerados.");
        return resumo;
      }
      var inicio = Number(ativacao);
      if (!isFinite(inicio) || inicio <= 0) throw new Error("Data de ativação da IA inválida.");
      var clientes = AgendamentoRepository.listarClientes();
      var profissionais = AgendamentoRepository.listarFuncionarios();
      var servicos = AgendamentoRepository.listarServicos();
      var pesquisa = Utilities.formatDate(new Date(inicio - 86400000),
        Session.getScriptTimeZone(), "yyyy/MM/dd");
      var conversas = GmailApp.search("subject:Agendamento after:" + pesquisa, 0, LIMITE_CONVERSAS);
      conversas.forEach(function (conversa) {
        conversa.getMessages().forEach(function (mensagem) {
          if (normalizarNome_(mensagem.getSubject()) !== "agendamento") return;
          if (mensagem.getDate().getTime() < inicio) return;
          var chave = PREFIXO_PROCESSADO + mensagem.getId();
          var item = {
            assunto: mensagem.getSubject(),
            recebidoEm: Utilities.formatDate(mensagem.getDate(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
            situacao: "", motivo: ""
          };
          resumo.mensagens.push(item);
          if (propriedades.getProperty(chave)) {
            resumo.ignorados++;
            item.situacao = "Já processado";
            item.motivo = "Mensagem cadastrada anteriormente.";
            return;
          }
          try {
            var entrada = AgendamentoGroqService.extrairAgendamento(mensagem.getPlainBody());
            var cliente = localizarUnico_(entrada.cliente, clientes, "Cliente");
            var profissional = localizarUnico_(entrada.profissional, profissionais, "Profissional");
            var servico = localizarUnico_(entrada.servico, servicos, "Serviço");
            var dados = {
              data: entrada.data, hora: entrada.hora,
              codigo_cliente: cliente.codigo,
              codigo_funcionario: profissional.codigo,
              codigo_servico: servico.codigo,
              status: "AGENDADO"
            };
            AgendamentoValidator.validarCadastro(dados);
            AgendamentoRules.validarDisponibilidadeEmail(
              dados, servico, AgendamentoRepository.listarParaConflito(), servicos);
            var resultado = AgendamentoService.cadastrar(dados);
            propriedades.setProperty(chave, resultado);
            resumo.cadastrados++;
            item.situacao = "Cadastrado";
            item.motivo = resultado;
          } catch (erro) {
            resumo.rejeitados++;
            item.situacao = "Não cadastrado";
            item.motivo = erro.message || String(erro);
          }
        });
      });
      if (conversas.length === LIMITE_CONVERSAS) {
        resumo.detalhes.push("Limite de conversas atingido. Podem existir outras mensagens.");
      }
      return resumo;
    } finally {
      trava.releaseLock();
    }
  }
  return {verificar: verificar};
})();

/** Ponto de entrada público do novo botão de e-mails com IA. */
function verificarEmailsAgendamentoIA() {
  return AgendamentoEmailIAService.verificar();
}
