/** Coordena leitura, validação e treinamento da previsão de demanda. */
function treinarAgendamentoDeepLearning(parametros) {
  var p=AgendamentoDeepLearningValidator.validar(parametros);
  var dados=AgendamentoDeepLearningRepository.ler();
  var resultado=AgendamentoDeepLearningRules.executar(dados.serie,p);
  resultado.diagnostico={invalidos:dados.invalidos,duplicados:dados.duplicados,referencia:dados.referencia};
  resultado.treinadoEm=new Date().toISOString();
  return resultado;
}