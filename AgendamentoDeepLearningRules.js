/** Rede MLP com retropropagação, divisão cronológica e previsão recursiva. */
var AgendamentoDeepLearningRules = {
  /** Treina e avalia uma série diária sem usar alvos futuros no treinamento. */
  executar: function(serie,p){
    var n=serie.length, corte=Math.floor(n*p.treino/100), w=p.janela;
    if(corte<w+10||n-corte<10)throw new Error('Histórico insuficiente para treino e validação.');
    var media=function(a){return a.reduce(function(s,v){return s+v;},0)/a.length;};
    var vals=serie.map(function(r){return r.valor;}), base=media(vals.slice(0,corte));
    var escala=Math.sqrt(media(vals.slice(0,corte).map(function(v){return (v-base)**2;})))||1;
    var seed=p.semente>>>0, rnd=function(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296-.5;};
    var W=Array.from({length:p.neuronios},function(){return [rnd(),rnd(),rnd()];}), B=W.map(function(){return 0;}), V=W.map(rnd), b=0;
    var act=function(x){return p.ativacao==='relu'?Math.max(0,x):p.ativacao==='sigmoid'?1/(1+Math.exp(-x)):Math.tanh(x);};
    var deriv=function(h){return p.ativacao==='relu'?(h>0?1:0):p.ativacao==='sigmoid'?h*(1-h):1-h*h;};
    var input=function(d,h){var a=new Date(d).getUTCDay()*2*Math.PI/7;return [Math.sin(a),Math.cos(a),(media(h.slice(-w))-base)/escala];};
    var forward=function(x){var h=W.map(function(row,j){return act(row.reduce(function(s,v,k){return s+v*x[k];},B[j]));});return {h:h,y:h.reduce(function(s,v,j){return s+v*V[j];},b)};};
    var loss=[];
    for(var e=0;e<p.epocas;e++){var mse=0;for(var i=w;i<corte;i++){var x=input(serie[i].data,vals.slice(i-w,i)),f=forward(x),err=f.y-(vals[i]-base)/escala; mse+=err*err; var delta=V.map(function(v,j){return err*v*deriv(f.h[j]);});V.forEach(function(v,j){V[j]-=p.taxa*err*f.h[j];B[j]-=p.taxa*delta[j];W[j]=W[j].map(function(v,k){return v-p.taxa*delta[j]*x[k];});});b-=p.taxa*err;}if(!Number.isFinite(mse))throw new Error('Treinamento instável; reduza a taxa.');loss.push(mse/(corte-w));}
    var prever=function(d,h){return Math.max(0,forward(input(d,h)).y*escala+base);};
    var validacao=serie.slice(corte).map(function(r,j){return {data:r.data,real:r.valor,previsao:prever(r.data,vals.slice(0,corte+j)),base:base};});
    var mae=media(validacao.map(function(r){return Math.abs(r.real-r.previsao);})), maeBase=media(validacao.map(function(r){return Math.abs(r.real-base);}));
    var erros=[], errosBase=[];
    for(var o=corte;o+10<=n;o++){var hist=vals.slice(0,o);for(var j=0;j<10;j++){var pred=prever(serie[o+j].data,hist);hist.push(pred);erros.push(Math.abs(vals[o+j]-pred));errosBase.push(Math.abs(vals[o+j]-base));}}
    var hist=vals.slice(), futuro=[], ultimo=Date.parse(serie[n-1].data);
    for(var j=1;j<=p.horizonte;j++){var d=new Date(ultimo+j*86400000).toISOString().slice(0,10),v=prever(d,hist);hist.push(v);futuro.push({data:d,previsao:v,base:base});}
    return {parametros:p,treino:corte,validacaoDias:n-corte,mae:mae,maeBase:maeBase,mae10:media(erros),maeBase10:media(errosBase),loss:loss,validacao:validacao,futuro:futuro,historico:serie.slice(-60),total:vals.reduce(function(a,b){return a+b;},0),media:media(vals)};
  }
};