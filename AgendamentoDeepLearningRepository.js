/** Repositório de datas de criação, sem alterar a planilha. */
var AgendamentoDeepLearningRepository = {
  /** @return {Object} Série diária e diagnóstico de registros. */
  ler: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var aba = ss.getSheetByName('AGENDA');
    if (!aba) throw new Error('Aba AGENDA não encontrada.');
    var rows = aba.getDataRange().getValues(), tz = ss.getSpreadsheetTimeZone();
    var h = rows.shift().map(function(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');});
    var i=h.indexOf('datacadastro'), k=h.indexOf('codigo');
    if(i<0||k<0) throw new Error('Cabeçalhos obrigatórios ausentes.');
    var seen=new Set(), counts={}, invalidos=0, duplicados=0;
    rows.forEach(function(r){
      var id=String(r[k]).trim(), v=r[i], d='';
      if(!id)return;
      if(v instanceof Date && !isNaN(v)) d=Utilities.formatDate(v,tz,'yyyy-MM-dd');
      else {var m=String(v).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s.*)?$/); d=m?m[3]+'-'+m[2]+'-'+m[1]:String(v).trim().slice(0,10);}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d){invalidos++;return;}
      if(seen.has(id)){duplicados++;return;} seen.add(id); counts[d]=(counts[d]||0)+1;
    });
    var keys=Object.keys(counts).sort(), hoje=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
    if(!keys.length)throw new Error('Sem datas válidas.');
    var fim=new Date(hoje).getTime()-86400000, serie=[];
    for(var t=Date.parse(keys[0]);t<=fim;t+=86400000){var d=new Date(t).toISOString().slice(0,10);serie.push({data:d,valor:counts[d]||0});}
    return {serie:serie,invalidos:invalidos,duplicados:duplicados,referencia:hoje};
  }
};