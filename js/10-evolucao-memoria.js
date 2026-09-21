/* ---------------------------------------------------------
   EVOLUÇÃO — retrospectiva, linha do tempo, histórico
   --------------------------------------------------------- */
let evolucaoTab = 'retrospectiva';
let retroModo = 'semana';
let retroData = new Date();
let historicoData = new Date();

function retroIntervalo(){
  if (retroModo === 'semana'){ const seg = mondayOf(isoFromDate(retroData)); return [seg, addDaysISO(seg,6)]; }
  if (retroModo === 'ano'){ const ano = retroData.getFullYear(); return [`${ano}-01-01`, `${ano}-12-31`]; }
  const ano = retroData.getFullYear(), mes = retroData.getMonth();
  return [isoFromDate(new Date(ano,mes,1)), isoFromDate(new Date(ano,mes+1,0))];
}
function retroTitulo(){
  const [ini] = retroIntervalo();
  if (retroModo === 'semana') return tituloSemana(ini);
  if (retroModo === 'ano') return `Ano de ${retroData.getFullYear()}`;
  return retroData.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
}
function renderRetrospectiva(){
  const [ini, fim] = retroIntervalo();
  const noIntervalo = iso => iso && iso >= ini && iso <= fim;

  const sessoes = DB.getAll('sessoes').filter(s => s.status==='Realizada' && noIntervalo(s.data));
  const minutos = sessoes.reduce((t,s) => t+(s.duracaoMin||0), 0);
  const tarefasConcluidas = DB.getAll('tarefas').filter(t => t.status==='Concluída' && noIntervalo(t.dataConclusao));
  const registros = DB.getAll('registros').filter(r => noIntervalo(r.data));
  const reflexoes = DB.getAll('reflexoes').filter(r => noIntervalo(r.data));
  const metasConcluidas = DB.getAll('metas').filter(m => m.status==='Concluída' && noIntervalo(m.dataConclusao));
  const semana = retroModo==='semana' ? getSemana(ini) : null;
  const objetivosConcluidos = semana ? semana.objetivos.filter(o=>o.status==='Concluído') : [];
  const objetivosPendentes = semana ? semana.objetivos.filter(o=>o.status!=='Concluído') : [];

  document.getElementById('evolucaoConteudo').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <select class="input" id="retroModoSelect"><option value="semana" ${retroModo==='semana'?'selected':''}>Semana</option><option value="mes" ${retroModo==='mes'?'selected':''}>Mês</option><option value="ano" ${retroModo==='ano'?'selected':''}>Ano</option></select>
        <button class="btn btn-ghost" id="retroPrev">‹</button><strong style="align-self:center">${retroTitulo()}</strong><button class="btn btn-ghost" id="retroNext">›</button>
      </div>
    </div>
    <div class="report-content">
      <div class="report-grid">
        ${[['Horas estudadas',(minutos/60).toFixed(1)+'h'],['Sessões de estudo',sessoes.length],['Tarefas concluídas',tarefasConcluidas.length],['Registros no diário',registros.length],['Reflexões escritas',reflexoes.length],['Metas concluídas',metasConcluidas.length]]
          .map(([label,num]) => `<div class="report-item"><div class="r-num">${num}</div><div class="r-label">${label}</div></div>`).join('')}
      </div>
      ${semana ? `
        <h3 class="report-section-title">Objetivos da semana</h3>
        <div class="history-list">
          ${objetivosConcluidos.map(o=>`<div class="history-row">✅ ${escapeHTML(o.titulo)}</div>`).join('')}
          ${objetivosPendentes.map(o=>`<div class="history-row">⏳ ${escapeHTML(o.titulo)} (${o.progresso||0}%)</div>`).join('')}
          ${!semana.objetivos.length ? '<p class="muted">Nenhum objetivo foi definido para esta semana.</p>' : ''}
        </div>
        ${semana.revisao ? `<h3 class="report-section-title">Sua revisão desta semana</h3><div class="history-list">${PERGUNTAS_REVISAO.filter(([k])=>semana.revisao[k]).map(([k,label])=>`<div class="history-row"><strong>${label}</strong><br>${escapeHTML(semana.revisao[k])}</div>`).join('') || '<p class="muted">Sem respostas registradas.</p>'}</div>` : ''}
      ` : ''}
      <h3 class="report-section-title">Registros importantes do período</h3>
      <div class="history-list">${registros.slice(0,10).map(r => `<div class="history-row"><span class="h-meta">${formatDateBR(r.data)}</span><br>${tipoRegistroIcon(r.tipo)} ${escapeHTML(r.titulo)}</div>`).join('') || '<p class="muted">Nenhum registro no período.</p>'}</div>
    </div>`;
  document.getElementById('retroModoSelect').addEventListener('change', e => { retroModo = e.target.value; renderRetrospectiva(); });
  document.getElementById('retroPrev').addEventListener('click', () => { if (retroModo==='semana') retroData.setDate(retroData.getDate()-7); else if (retroModo==='ano') retroData.setFullYear(retroData.getFullYear()-1); else retroData.setMonth(retroData.getMonth()-1); renderRetrospectiva(); });
  document.getElementById('retroNext').addEventListener('click', () => { if (retroModo==='semana') retroData.setDate(retroData.getDate()+7); else if (retroModo==='ano') retroData.setFullYear(retroData.getFullYear()+1); else retroData.setMonth(retroData.getMonth()+1); renderRetrospectiva(); });
}

function timelineItems(inicioIso, fimIso){
  const agenda = itemsAgenda(inicioIso, fimIso).map(i => ({data:i.data, horario:i.horarioInicio||'', titulo:i.titulo, tipo:i.tipo}));
  const registros = DB.getAll('registros').filter(r => r.data>=inicioIso && r.data<=fimIso).map(r => ({data:r.data, horario:r.hora||'', titulo:`${tipoRegistroIcon(r.tipo)} ${r.titulo}`, tipo:r.tipo}));
  const reflexoes = DB.getAll('reflexoes').filter(r => r.data>=inicioIso && r.data<=fimIso).map(r => ({data:r.data, horario:'23:59', titulo:'🧠 Reflexão do dia', tipo:'Reflexão'}));
  return [...agenda, ...registros, ...reflexoes].sort((a,b) => `${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`));
}
function renderTimeline(){
  const fim = todayISO(); const inicio = addDaysISO(fim, -30);
  const itens = timelineItems(inicio, fim);
  const porDia = {};
  itens.forEach(i => { (porDia[i.data] = porDia[i.data] || []).push(i); });
  const dias = Object.keys(porDia).sort((a,b)=>b.localeCompare(a));
  document.getElementById('evolucaoConteudo').innerHTML = `<p class="muted" style="margin-bottom:12px">Últimos 30 dias.</p>` + (dias.length ? dias.map(dia => `
    <div class="activity-day">${formatDateBR(dia)}</div>
    ${porDia[dia].map(i => `<div class="activity-row"><span class="activity-time">${i.horario||'—'}</span><span>${escapeHTML(i.titulo)} <span class="muted" style="font-size:11px">(${escapeHTML(i.tipo)})</span></span></div>`).join('')}
  `).join('') : '<p class="muted">Nada registrado nos últimos 30 dias.</p>');
}

function abrirDetalheDiaHistorico(iso){
  const itens = timelineItems(iso, iso);
  openModal(formatDateBR(iso), itens.length ? `<div class="activity-list">${itens.map(i => `<div class="activity-row"><span class="activity-time">${i.horario||'—'}</span><span>${escapeHTML(i.titulo)}</span></div>`).join('')}</div><div class="modal-actions"><button class="btn btn-ghost" id="histFechar">Fechar</button></div>` : '<p class="muted">Nenhum registro neste dia.</p><div class="modal-actions"><button class="btn btn-ghost" id="histFechar">Fechar</button></div>');
  document.getElementById('histFechar').onclick = closeModal;
}
function renderHistoricoDiario(){
  const ano = historicoData.getFullYear(), mes = historicoData.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const inicioGrid = new Date(primeiro); inicioGrid.setDate(1 - ((primeiro.getDay()+6)%7));
  const itens = timelineItems(isoFromDate(inicioGrid), isoFromDate(new Date(ano,mes+1,13)));
  let html = `<div class="toolbar"><div class="filters"><button class="btn btn-ghost" id="histPrev">‹</button><strong style="align-self:center">${historicoData.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}</strong><button class="btn btn-ghost" id="histNext">›</button></div></div>`;
  html += '<div class="mini-month-grid">' + ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=>`<div class="mini-month-head">${d}</div>`).join('');
  const cursor = new Date(inicioGrid);
  for (let i=0;i<42;i++){
    const iso = isoFromDate(cursor);
    const doDia = itens.filter(it => it.data === iso);
    const foraDoMes = cursor.getMonth() !== mes;
    html += `<div class="mini-month-cell ${foraDoMes?'is-out':''} ${iso===todayISO()?'is-today':''}" data-dia="${iso}"><span>${cursor.getDate()}</span>${doDia.length?`<span class="mini-month-dot">${doDia.length}</span>`:''}</div>`;
    cursor.setDate(cursor.getDate()+1);
  }
  html += '</div>';
  document.getElementById('evolucaoConteudo').innerHTML = html;
  document.getElementById('histPrev').addEventListener('click', () => { historicoData.setMonth(historicoData.getMonth()-1); renderHistoricoDiario(); });
  document.getElementById('histNext').addEventListener('click', () => { historicoData.setMonth(historicoData.getMonth()+1); renderHistoricoDiario(); });
  document.querySelectorAll('#evolucaoConteudo [data-dia]').forEach(cell => cell.addEventListener('click', () => abrirDetalheDiaHistorico(cell.dataset.dia)));
}
function renderEvolucao(){
  document.querySelectorAll('#evolucaoTabs .diario-tab').forEach(t => t.classList.toggle('is-active', t.dataset.evtab===evolucaoTab));
  if (evolucaoTab === 'timeline') renderTimeline();
  else if (evolucaoTab === 'historico') renderHistoricoDiario();
  else renderRetrospectiva();
}
document.querySelectorAll('#evolucaoTabs .diario-tab').forEach(t => t.addEventListener('click', () => { evolucaoTab = t.dataset.evtab; renderEvolucao(); }));

/* ---------------------------------------------------------
   MEMÓRIA — pesquisa geral
   --------------------------------------------------------- */
function buscarNoDiario(termo){
  const q = termo.trim().toLowerCase();
  if (!q) return {registros:[], sessoes:[], tarefas:[], metas:[], reflexoes:[], eventos:[]};
  const registros = DB.getAll('registros').filter(r => [r.titulo,r.texto,r.categoria,...(r.tags||[])].join(' ').toLowerCase().includes(q));
  const sessoes = DB.getAll('sessoes').filter(s => [nomeMateria(s.materiaId),s.assunto,s.oQueAprendi,s.observacoes].join(' ').toLowerCase().includes(q));
  const tarefas = DB.getAll('tarefas').filter(t => [t.titulo,t.categoria,t.observacao].join(' ').toLowerCase().includes(q));
  const metas = DB.getAll('metas').filter(m => [m.titulo,m.descricao,m.observacoes].join(' ').toLowerCase().includes(q));
  const reflexoes = DB.getAll('reflexoes').filter(r => [r.textoLivre, ...Object.values(r.respostas||{})].join(' ').toLowerCase().includes(q));
  const eventos = DB.getAll('eventos').filter(e => [e.titulo,e.descricao,e.local].join(' ').toLowerCase().includes(q));
  return {registros, sessoes, tarefas, metas, reflexoes, eventos};
}
function renderMemoria(){
  const input = document.getElementById('buscaMemoriaInput');
  function render(){
    const termo = input.value;
    const container = document.getElementById('resultadosMemoria');
    if (!termo.trim()){ container.innerHTML = '<p class="muted">Digite um termo para pesquisar em todo o seu Mega Diário.</p>'; return; }
    const r = buscarNoDiario(termo);
    const blocos = [
      {titulo:'Diário', itens:r.registros, render:x=>({titulo:x.titulo, data:x.data, sub:x.tipo, go:()=>abrirDetalheRegistroDiario(x.id)})},
      {titulo:'Estudos', itens:r.sessoes, render:x=>({titulo:`${nomeMateria(x.materiaId)} — ${x.assunto}`, data:x.data, sub:x.status, go:()=>openFormSessaoEstudo(x.id)})},
      {titulo:'Tarefas', itens:r.tarefas, render:x=>({titulo:x.titulo, data:x.prazo, sub:x.status, go:()=>openFormTarefa(x.id)})},
      {titulo:'Metas', itens:r.metas, render:x=>({titulo:x.titulo, data:x.prazo, sub:x.status, go:()=>abrirDetalheMeta(x.id)})},
      {titulo:'Reflexões', itens:r.reflexoes, render:x=>({titulo:'Reflexão', data:x.data, sub:'', go:()=>abrirDetalheReflexao(x.id)})},
      {titulo:'Agenda', itens:r.eventos, render:x=>({titulo:x.titulo, data:x.data, sub:x.tipo, go:()=>abrirDetalheEvento(x.id)})}
    ].filter(b => b.itens.length);
    if (!blocos.length){ container.innerHTML = `<p class="muted">Não encontramos resultados para "${escapeHTML(termo)}".</p>`; return; }
    container.innerHTML = blocos.map((b,bi) => `<div class="panel"><div class="panel-head"><h2>${b.titulo}</h2><span class="muted">${b.itens.length} resultado${b.itens.length===1?'':'s'}</span></div>
      <div class="attention-list">${b.itens.map((it,i) => { const rr = b.render(it); return `<div class="attn-item" data-b="${bi}" data-i="${i}"><div class="attn-main"><div class="attn-title">${escapeHTML(rr.titulo)}</div><div class="attn-sub">${rr.data?formatDateBR(rr.data):''} ${rr.sub?'· '+escapeHTML(rr.sub):''}</div></div></div>`; }).join('')}</div></div>`).join('');
    blocos.forEach((b,bi) => container.querySelectorAll(`[data-b="${bi}"]`).forEach(el => el.addEventListener('click', () => b.render(b.itens[Number(el.dataset.i)]).go())));
  }
  input.removeEventListener('input', input._handler || (()=>{}));
  input._handler = render;
  input.addEventListener('input', render);
  render();
}
