const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=vm.createContext({});for(const f of ['Validator','Rules'])vm.runInContext(fs.readFileSync('AgendamentoDeepLearning'+f+'.js','utf8'),c);
const p=c.AgendamentoDeepLearningValidator.validar({epocas:100});
const s=Array.from({length:120},(_,i)=>({data:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10),valor:i%7}));
const a=c.AgendamentoDeepLearningRules.executar(s,p),b=c.AgendamentoDeepLearningRules.executar(s,p);
assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(a.futuro.length,10);assert.ok(a.futuro.every(x=>Number.isFinite(x.previsao)&&x.previsao>=0));assert.ok(Number.isFinite(a.mae10));assert.throws(()=>c.AgendamentoDeepLearningValidator.validar({taxa:2}));assert.throws(()=>c.AgendamentoDeepLearningRules.executar(s.slice(0,10),p));console.log('Testes MLP passaram');