/**
 * Entidade: Agendamento
 * Camada: Service — integração de e-mails
 *
 * Responsabilidade: processar mensagens recebidas com assunto exatamente
 * "Agendamento" e reutilizar o cadastro existente, sem criar entidades.
 * Dependências: GmailApp, PropertiesService, LockService, AgendamentoService,
 * AgendamentoRepository, AgendamentoRules e AgendamentoValidator.
 *
 * A consulta é manual. Mensagens não processadas permanecem disponíveis
 * para nova tentativa. O remetente não é restringido por regra de negócio.
 */
var AgendamentoEmailService = (function () {
  var PREFIXO = "agenda_email_processado_";
  var LIMITE_CONVERSAS = 300;

  /** Normaliza nomes apenas para comparação, preservando códigos originais. */
  function chaveNome_(valor) {
    return String(valor || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  /**
   * Resolve nome existente com correspondência única.
   * @throws {Error} Quando não encontrado ou quando existem homônimos.
   */
  function resolver_(nome, itens, campo) {
    var chave = chaveNome_(nome);
    var encontrados = itens.filter(function (item) {
      return chaveNome_(item.nome) === chave;
    });
    if (encontrados.length !== 1) {
      throw new Error(campo + ": " +
        (encontrados.length ? "nome ambíguo" : "cadastro não encontrado") +
        " (" + nome + ").");
    }
    return encontrados[0];
  }

  /** Extrai somente os cinco campos esperados, um por linha. */
  function extrair_(corpo) {
    var campos = {};
    String(corpo || "").split(/\r?\n/).forEach(function (linha) {
      var resultado = /^\s*(Cliente|Servi[cç]o|Profissional|Data|Hora)\s*:\s*(.*?)\s*$/i.exec(linha);
      if (!resultado) return;
      var chave = chaveNome_(resultado[1]);
      if (Object.prototype.hasOwnProperty.call(campos, chave)) {
        throw new Error("Campo repetido: " + resultado[1] + ".");
      }
      campos[chave] = resultado[2];
    });
    ["cliente", "servico", "profissional", "data", "hora"].forEach(function (campo) {
      if (!campos[campo]) throw new Error("Campo ausente: " + campo + ".");
    });
    var data = campos.data;
    var br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
    if (br) data = br[3] + "-" + br[2] + "-" + br[1];
    return {
      cliente: campos.cliente,
      servico: campos.servico,
      profissional: campos.profissional,
      data: data,
      hora: campos.hora
    };
  }

  /**
   * Processa mensagens novas ainda não registradas, com trava de concorrência.
   * @return {Object} Quantidades e erros por mensagem, para exibição na tela.
   */
  function verificar() {
    var trava = LockService.getScriptLock();
    if (!trava.tryLock(10000)) {
      throw new Error("Outra verificação está em andamento. Tente novamente.");
    }
    try {
      var propriedades = PropertiesService.getScriptProperties();
      var resumo = {cadastrados: 0, ignorados: 0, rejeitados: 0, detalhes: []};
      var clientes = AgendamentoRepository.listarClientes();
      var profissionais = AgendamentoRepository.listarFuncionarios();
      var servicos = AgendamentoRepository.listarServicos();
      var conversas = [];
      for (var inicio = 0; inicio < LIMITE_CONVERSAS; inicio += 100) {
        var lote = GmailApp.search('subject:Agendamento', inicio, 100);
        conversas = conversas.concat(lote);
        if (lote.length < 100) break;
      }
      // A pesquisa do Gmail localiza assuntos semelhantes: conferir igualdade.
      conversas.forEach(function (conversa) {
        conversa.getMessages().forEach(function (mensagem) {
          if (String(mensagem.getSubject()).trim() !== "Agendamento") return;
          var chave = PREFIXO + mensagem.getId();
          if (propriedades.getProperty(chave)) {
            resumo.ignorados++;
            return;
          }
          try {
            var entrada = extrair_(mensagem.getPlainBody());
            var cliente = resolver_(entrada.cliente, clientes, "Cliente");
            var profissional = resolver_(entrada.profissional, profissionais, "Profissional");
            var servico = resolver_(entrada.servico, servicos, "Serviço");
            var dados = {
              data: entrada.data,
              hora: entrada.hora,
              codigo_cliente: cliente.codigo,
              codigo_funcionario: profissional.codigo,
              codigo_servico: servico.codigo,
              status: "AGENDADO"
            };
            AgendamentoValidator.validarCadastro(dados);
            var existentes = AgendamentoRepository.listarParaConflito();
            AgendamentoRules.validarDisponibilidadeEmail(dados, servico, existentes, servicos);
            // Se a gravação ocorrer e a propriedade falhar, a checagem de
            // horário na próxima execução evita repetir o mesmo compromisso.
            var resultado = AgendamentoService.cadastrar(dados);
            propriedades.setProperty(chave, resultado);
            resumo.cadastrados++;
          } catch (erro) {
            resumo.rejeitados++;
            resumo.detalhes.push("Mensagem " + mensagem.getId() + ": " + erro.message);
          }
        });
      });
      if (conversas.length >= LIMITE_CONVERSAS) {
        resumo.detalhes.push("Limite de " + LIMITE_CONVERSAS +
          " conversas atingido; verifique novamente após organizar os e-mails.");
      }
      return resumo;
    } finally {
      trava.releaseLock();
    }
  }

  return {verificar: verificar};
})();

/**
 * Ponto de entrada da interface. O Google Apps Script solicitará autorização
 * de acesso ao Gmail na primeira execução autorizada.
 * @return {Object} Resultado da verificação.
 */
function verificarEmailsAgendamento() {
  return AgendamentoEmailService.verificar();
}
