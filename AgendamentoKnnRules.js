/**
 * Entidade: Agendamento
 * Camada: Rules — Regras de negócio / modelo KNN.
 * Responsabilidade: estimar frequência de faltas entre os K vizinhos mais próximos.
 * Dependências: nenhuma. Não acessa Google Sheets.
 *
 * AVISO: previsões experimentais; treinamento com dados simulados não valida
 * uso em pacientes reais. A coluna Status é o rótulo de treinamento, nunca
 * uma característica preditiva. Apenas agendamentos concluídos treinam.
 */
var AgendamentoKnnRules = (function () {
  var K = 7;
  var MINIMO = 20;

  /** Converte data brasileira ou ISO em dia da semana, sem dependência de fuso. */
  function diaSemana(data) {
    var texto = String(data || "").trim();
    var partes = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(texto);
    if (partes) return new Date(Date.UTC(+partes[3], +partes[2]-1, +partes[1])).getUTCDay();
    partes = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(texto);
    return partes ? new Date(Date.UTC(+partes[1], +partes[2]-1, +partes[3])).getUTCDay() : null;
  }

  /** Extrai somente características conhecidas antes do atendimento. */
  function caracteristicas(registro) {
    var dia = diaSemana(registro.data);
    var hora = /^([0-9]{1,2}):([0-9]{2})/.exec(String(registro.hora || ""));
    if (dia === null || !hora) return null;
    return {
      dia: dia,
      minutos: +hora[1] * 60 + +hora[2],
      cliente: String(registro.codigoCliente || ""),
      funcionario: String(registro.codigoFuncionario || ""),
      servico: String(registro.codigoServico || "")
    };
  }

  /** Distância mista com pesos fixos, sem incluir o resultado da consulta. */
  function distancia(a, b) {
    var diferencaDia = Math.abs(a.dia - b.dia);
    diferencaDia = Math.min(diferencaDia, 7 - diferencaDia);
    return (diferencaDia / 3) * 0.20 +
      (Math.min(Math.abs(a.minutos - b.minutos), 720) / 720) * 0.20 +
      (a.cliente === b.cliente ? 0 : 1) * 0.30 +
      (a.funcionario === b.funcionario ? 0 : 1) * 0.15 +
      (a.servico === b.servico ? 0 : 1) * 0.15;
  }

  /**
   * Estima o percentual de faltas entre K vizinhos.
   * @param {Object} agendamento Registro pendente.
   * @param {Object[]} historico Histórico de atendimentos.
   * @return {number|null} Percentual de 0 a 100 ou null se insuficiente.
   */
  function prever(agendamento, historico) {
    var alvo = caracteristicas(agendamento);
    if (!alvo) return null;
    var exemplos = (historico || []).filter(function (registro) {
      return registro.status === "FALTOU" || registro.status === "COMPARECEU";
    }).map(function (registro) {
      return {registro: registro, caracteristicas: caracteristicas(registro)};
    }).filter(function (exemplo) { return exemplo.caracteristicas !== null; });
    if (exemplos.length < MINIMO) return null;
    exemplos.sort(function (a, b) {
      return distancia(alvo, a.caracteristicas) - distancia(alvo, b.caracteristicas);
    });
    var vizinhos = exemplos.slice(0, Math.min(K, exemplos.length));
    var faltas = vizinhos.filter(function (exemplo) {
      return exemplo.registro.status === "FALTOU";
    }).length;
    return Math.round(100 * faltas / vizinhos.length);
  }
  return {prever: prever};
})();
