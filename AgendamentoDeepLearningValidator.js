/** Valida parâmetros numéricos e opções do treinamento. */
var AgendamentoDeepLearningValidator = {
  validar: function(p){
    p=p||{}; var out={};
    var limites={neuronios:[5,1,30],epocas:[500,100,2000],taxa:[0.05,0.001,0.1],janela:[7,3,30],treino:[80,60,90],semente:[12345,0,2147483647],horizonte:[10,1,30]};
    Object.keys(limites).forEach(function(k){var l=limites[k],v=Number(p[k]===undefined?l[0]:p[k]);if(!Number.isFinite(v)||v<l[1]||v>l[2]||(k!=='taxa'&&!Number.isInteger(v)))throw new Error('Parâmetro inválido: '+k);out[k]=v;});
    out.ativacao=p.ativacao||'tanh';if(['tanh','relu','sigmoid'].indexOf(out.ativacao)<0)throw new Error('Ativação inválida.');return out;
  }
};