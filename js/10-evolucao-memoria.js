/* ---------------------------------------------------------
   EVOLUÇÃO — retrospectiva, linha do tempo, histórico
   --------------------------------------------------------- */
let evolucaoTab = 'retrospectiva';
let retroModo = 'semana';
let retroData = new Date();
let historicoData = new Date();
let timelineModo = '30dias';
let timelinePersonalizadoIni = addDaysISO(todayISO(), -30);
let timelinePersonalizadoFim = todayISO();

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

  const stats = estatisticasPeriodo(ini, fim);
  const registros = DB.getAll('registros').filter(r => noIntervalo(r.data));
  const semana = retroModo==='semana' ? getSemana(ini) : null;
  const objetivosConcluidos = semana ? semana.objetivos.filter(o=>o.status==='Concluído') : [];
  const objetivosPendentes = semana ? semana.objetivos.filter(o=>o.status!=='Concluído') : [];

  const [iniAnt, fimAnt] = retroModo==='semana' ? [addDaysISO(ini,-7), addDaysISO(fim,-7)] : [ini, fim];
  const statsAnterior = retroModo==='semana' ? estatisticasPeriodo(iniAnt, fimAnt) : null;
  const deltaMin = statsAnterior ? stats.minutosEstudo - statsAnterior.minutosEstudo : null;

  document.getElementById('evolucaoConteudo').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <select class="input" id="retroModoSelect"><option value="semana" ${retroModo==='semana'?'selected':''}>Semana</option><option value="mes" ${retroModo==='mes'?'selected':''}>Mês</option><option value="ano" ${retroModo==='ano'?'selected':''}>Ano</option></select>
        <button class="btn btn-ghost" id="retroPrev">‹</button><strong style="align-self:center">${retroTitulo()}</strong><button class="btn btn-ghost" id="retroNext">›</button>
      </div>
    </div>
    <div class="report-content">
      <div class="report-grid">
        ${[['Horas estudadas',(stats.minutosEstudo/60).toFixed(1)+'h'],['Sessões de estudo',stats.sessoes],['Tarefas concluídas',stats.tarefasConcluidas],['Rotinas realizadas',stats.rotinasRealizadas],['Registros no diário',stats.registros],['Reflexões escritas',stats.reflexoes],['Metas concluídas',stats.metasConcluidas],['Dias ativos',`${stats.diasAtivos}/${stats.diasNoPeriodo}`]]
          .map(([label,num]) => `<div class="report-item"><div class="r-num">${num}</div><div class="r-label">${label}</div></div>`).join('')}
      </div>
      ${deltaMin !== null ? `<p class="muted" style="margin:-8px 0 16px">${deltaMin===0 ? 'Mesmo tempo de estudo que a semana anterior.' : deltaMin>0 ? `📈 ${(deltaMin/60).toFixed(1)}h a mais de estudo que a semana anterior.` : `📉 ${(Math.abs(deltaMin)/60).toFixed(1)}h a menos de estudo que a semana anterior.`}</p>` : ''}
      ${retroModo==='semana' ? renderBarraEstudoSemana(ini, fim) : ''}
      ${semana ? `
        <h3 class="report-section-title">Objetivos da semana</h3>
        <div class="history-list">
          ${objetivosConcluidos.map(o=>`<div class="history-row">✅ ${escapeHTML(o.titulo)}</div>`).join('')}
          ${objetivosPendentes.map(o=>`<div class="history-row">⏳ ${escapeHTML(o.titulo)} (${o.progresso||0}%)</div>`).join('')}
          ${!semana.objetivos.length ? '<p class="muted">Nenhum objetivo foi definido para esta semana.</p>' : ''}
        </div>
        ${semana.revisao ? `<h3 class="report-section-title">Sua revisão desta semana</h3><div class="history-list">${PERGUNTAS_REVISAO.filter(([k])=>semana.revisao[k]).map(([k,label])=>`<div class="history-row"><strong>${label}</strong><br>${escapeHTML(semana.revisao[k])}</div>`).join('') || '<p class="muted">Sem respostas registradas.</p>'}</div>` : ''}
      ` : ''}
      ${renderRegistrosAgrupadosPorTipo(registros)}
    </div>`;
  document.getElementById('retroModoSelect').addEventListener('change', e => { retroModo = e.target.value; renderRetrospectiva(); });
  document.getElementById('retroPrev').addEventListener('click', () => { if (retroModo==='semana') retroData.setDate(retroData.getDate()-7); else if (retroModo==='ano') retroData.setFullYear(retroData.getFullYear()-1); else retroData.setMonth(retroData.getMonth()-1); renderRetrospectiva(); });
  document.getElementById('retroNext').addEventListener('click', () => { if (retroModo==='semana') retroData.setDate(retroData.getDate()+7); else if (retroModo==='ano') retroData.setFullYear(retroData.getFullYear()+1); else retroData.setMonth(retroData.getMonth()+1); renderRetrospectiva(); });
}

const ORDEM_TIPOS_RETROSPECTIVA = ['Conquista','Aprendizado','Problema','Acontecimento','Momento importante','Ideia','Gratidão','Pensamento','Reflexão','Observação','Outro'];
function renderRegistrosAgrupadosPorTipo(registros){
  if (!registros.length) return '<h3 class="report-section-title">Registros do período</h3><p class="muted">Nenhum registro no período.</p>';
  const porTipo = {};
  registros.forEach(r => { (porTipo[r.tipo] = porTipo[r.tipo] || []).push(r); });
  const tipos = Object.keys(porTipo).sort((a,b) => {
    const ia = ORDEM_TIPOS_RETROSPECTIVA.indexOf(a), ib = ORDEM_TIPOS_RETROSPECTIVA.indexOf(b);
    return (ia===-1?99:ia) - (ib===-1?99:ib);
  });
  return `<h3 class="report-section-title">Registros do período, por tipo</h3>` + tipos.map(tipo => `
    <div class="detail-block"><div class="detail-label">${tipoRegistroIcon(tipo)} ${escapeHTML(tipo)} (${porTipo[tipo].length})</div>
      <div class="history-list">${porTipo[tipo].slice(0,6).map(r => `<div class="history-row"><span class="h-meta">${formatDateBR(r.data)}</span><br>${escapeHTML(r.titulo)}</div>`).join('')}</div>
    </div>`).join('');
}

function renderBarraEstudoSemana(ini, fim){
  const dados = minutosEstudoPorDia(ini, fim);
  const maior = Math.max(1, ...dados.map(d => d.minutos));
  return `<h3 class="report-section-title">Horas de estudo por dia</h3>
    <div class="bar-chart">${dados.map(d => {
      const alturaPct = Math.round((d.minutos / maior) * 100);
      const label = nomeDiaCurto(d.data).slice(0,3);
      const horas = (d.minutos/60).toFixed(1);
      return `<div class="bar-col" title="${label}: ${horas}h">
        <div class="bar-track"><div class="bar-fill ${d.data===todayISO()?'is-today':''}" style="height:${d.minutos?Math.max(alturaPct,4):0}%"></div></div>
        <div class="bar-value">${d.minutos ? horas+'h' : ''}</div>
        <div class="bar-label">${label}</div>
      </div>`;
    }).join('')}</div>`;
}

function renderSequencia(){
  const seq = calcularSequencia();
  const box = document.getElementById('evolucaoConteudo');
  box.innerHTML = `
    <div class="streak-hero">
      <div class="streak-hero-fire">🔥</div>
      <div class="streak-hero-num">${seq.atual}</div>
      <div class="streak-hero-label">dia${seq.atual===1?'':'s'} consecutivo${seq.atual===1?'':'s'} com atividade real</div>
    </div>
    <div class="report-grid">
      ${[['Sequência atual',seq.atual],['Melhor sequência',seq.melhor],['Dias ativos no total',seq.totalDiasAtivos]]
        .map(([label,num]) => `<div class="report-item"><div class="r-num">${num}</div><div class="r-label">${label}</div></div>`).join('')}
    </div>
    <p class="muted" style="margin-top:14px">Um dia conta como ativo quando há uma atividade real: uma sessão de estudo realizada, uma tarefa concluída, uma rotina marcada como feita, um registro no diário, uma reflexão ou progresso em uma meta. Apenas abrir o aplicativo não conta.</p>
    ${seq.diasAtivos.length ? `<h3 class="report-section-title">Últimos dias ativos</h3><div class="history-list">${[...seq.diasAtivos].reverse().slice(0,14).map(d=>`<div class="history-row">${formatDateBR(d)}</div>`).join('')}</div>` : ''}
  `;
}

function timelineItems(inicioIso, fimIso){
  const agenda = itemsAgenda(inicioIso, fimIso).map(i => ({data:i.data, horario:i.horarioInicio||'', titulo:i.titulo, tipo:i.tipo}));
  const registros = DB.getAll('registros').filter(r => r.data>=inicioIso && r.data<=fimIso).map(r => ({data:r.data, horario:r.hora||'', titulo:`${tipoRegistroIcon(r.tipo)} ${r.titulo}`, tipo:r.tipo}));
  const reflexoes = DB.getAll('reflexoes').filter(r => r.data>=inicioIso && r.data<=fimIso).map(r => ({data:r.data, horario:'23:59', titulo:'🧠 Reflexão do dia', tipo:'Reflexão'}));
  return [...agenda, ...registros, ...reflexoes].sort((a,b) => `${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`));
}
function timelineIntervalo(){
  const hoje = todayISO();
  if (timelineModo === 'hoje') return [hoje, hoje];
  if (timelineModo === 'semana'){ const seg = mondayOf(hoje); return [seg, addDaysISO(seg,6)]; }
  if (timelineModo === 'mes'){ const d = new Date(); return [isoFromDate(new Date(d.getFullYear(),d.getMonth(),1)), isoFromDate(new Date(d.getFullYear(),d.getMonth()+1,0))]; }
  if (timelineModo === 'personalizado') return [timelinePersonalizadoIni, timelinePersonalizadoFim];
  return [addDaysISO(hoje, -30), hoje]; // '30dias' — comportamento original, mantido como opção
}
function renderTimeline(){
  const [inicio, fim] = timelineIntervalo();
  const itens = timelineItems(inicio, fim);
  const porDia = {};
  itens.forEach(i => { (porDia[i.data] = porDia[i.data] || []).push(i); });
  const dias = Object.keys(porDia).sort((a,b)=>b.localeCompare(a));
  const toolbarHTML = `<div class="toolbar"><div class="filters">
    <select class="input" id="timelineModoSelect">
      <option value="hoje" ${timelineModo==='hoje'?'selected':''}>Hoje</option>
      <option value="semana" ${timelineModo==='semana'?'selected':''}>Esta semana</option>
      <option value="mes" ${timelineModo==='mes'?'selected':''}>Este mês</option>
      <option value="30dias" ${timelineModo==='30dias'?'selected':''}>Últimos 30 dias</option>
      <option value="personalizado" ${timelineModo==='personalizado'?'selected':''}>Período personalizado</option>
    </select>
    ${timelineModo==='personalizado' ? `<input type="date" class="input" id="timelineIniInput" value="${timelinePersonalizadoIni}"> <input type="date" class="input" id="timelineFimInput" value="${timelinePersonalizadoFim}">` : ''}
  </div></div>`;
  document.getElementById('evolucaoConteudo').innerHTML = toolbarHTML + (dias.length ? dias.map(dia => `
    <div class="activity-day">${formatDateBR(dia)}</div>
    ${porDia[dia].map(i => `<div class="activity-row"><span class="activity-time">${i.horario||'—'}</span><span>${escapeHTML(i.titulo)} <span class="muted" style="font-size:11px">(${escapeHTML(i.tipo)})</span></span></div>`).join('')}
  `).join('') : '<p class="muted">Nada registrado neste período.</p>');
  document.getElementById('timelineModoSelect').addEventListener('change', e => { timelineModo = e.target.value; renderTimeline(); });
  document.getElementById('timelineIniInput')?.addEventListener('change', e => { timelinePersonalizadoIni = e.target.value; renderTimeline(); });
  document.getElementById('timelineFimInput')?.addEventListener('change', e => { timelinePersonalizadoFim = e.target.value; renderTimeline(); });
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
  else if (evolucaoTab === 'sequencia') renderSequencia();
  else renderRetrospectiva();
}
document.querySelectorAll('#evolucaoTabs .diario-tab').forEach(t => t.addEventListener('click', () => { evolucaoTab = t.dataset.evtab; renderEvolucao(); }));

/* ---------------------------------------------------------
   MEMÓRIA — pesquisa geral
   --------------------------------------------------------- */
function buscarNoDiario(termo){
  const q = termo.trim().toLowerCase();
  if (!q) return {registros:[], sessoes:[], tarefas:[], metas:[], reflexoes:[], eventos:[], rotinas:[], semanas:[]};
  const registros = DB.getAll('registros').filter(r => [r.titulo,r.texto,r.categoria,...(r.tags||[])].join(' ').toLowerCase().includes(q));
  const sessoes = DB.getAll('sessoes').filter(s => [nomeMateria(s.materiaId),s.assunto,s.oQueAprendi,s.observacoes].join(' ').toLowerCase().includes(q));
  const tarefas = DB.getAll('tarefas').filter(t => [t.titulo,t.categoria,t.observacao].join(' ').toLowerCase().includes(q));
  const metas = DB.getAll('metas').filter(m => [m.titulo,m.descricao,m.observacoes].join(' ').toLowerCase().includes(q));
  const reflexoes = DB.getAll('reflexoes').filter(r => [r.textoLivre, r.categoria, ...(r.tags||[]), ...Object.values(r.respostas||{})].join(' ').toLowerCase().includes(q));
  const eventos = DB.getAll('eventos').filter(e => [e.titulo,e.descricao,e.local].join(' ').toLowerCase().includes(q));
  const rotinas = DB.getAll('rotinas').filter(r => [r.titulo, r.categoria].join(' ').toLowerCase().includes(q));
  const semanas = DB.getAll('semanas').filter(s => [...Object.values(s.revisao||{}), ...Object.values(s.planejamento||{}), ...(s.objetivos||[]).map(o=>o.titulo)].join(' ').toLowerCase().includes(q));
  return {registros, sessoes, tarefas, metas, reflexoes, eventos, rotinas, semanas};
}
/* fonte única dos grupos de busca — usada pela view Memória e pelo
   modal de Busca global (Ctrl+K), para nunca mais precisar atualizar
   os dois lugares quando uma entidade nova entrar na pesquisa */
function blocosDeBusca(termo){
  const r = buscarNoDiario(termo);
  return [
    {titulo:'📝 Diário', itens:r.registros, render:x=>({titulo:x.titulo, sub:x.tipo, data:x.data, go:()=>abrirDetalheRegistroDiario(x.id)})},
    {titulo:'📚 Estudos', itens:r.sessoes, render:x=>({titulo:`${nomeMateria(x.materiaId)} — ${x.assunto}`, sub:x.status, data:x.data, go:()=>openFormSessaoEstudo(x.id)})},
    {titulo:'✅ Tarefas', itens:r.tarefas, render:x=>({titulo:x.titulo, sub:x.status, data:x.prazo, go:()=>openFormTarefa(x.id)})},
    {titulo:'🎯 Metas', itens:r.metas, render:x=>({titulo:x.titulo, sub:x.status, data:x.prazo, go:()=>abrirDetalheMeta(x.id)})},
    {titulo:'💭 Reflexões', itens:r.reflexoes, render:x=>({titulo:'Reflexão', sub:'', data:x.data, go:()=>abrirDetalheReflexao(x.id)})},
    {titulo:'🗓️ Agenda', itens:r.eventos, render:x=>({titulo:x.titulo, sub:x.tipo, data:x.data, go:()=>abrirDetalheEvento(x.id)})},
    {titulo:'🔄 Rotinas', itens:r.rotinas, render:x=>({titulo:x.titulo, sub:x.categoria, data:null, go:()=>openFormRotina(x.id)})},
    {titulo:'📆 Revisões semanais', itens:r.semanas, render:x=>({titulo:tituloSemana(x.id), sub:'', data:x.id, go:()=>{ semanaAtualInicio = x.id; goToView('semana'); }})}
  ].filter(b => b.itens.length);
}
function destacarTermo(texto, termo){
  if (!termo) return escapeHTML(texto);
  const escapado = escapeHTML(texto);
  const termoEsc = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapado.replace(new RegExp(`(${termoEsc})`, 'ig'), '<mark>$1</mark>');
}
/* renderiza os resultados dentro de qualquer container; opts.aoNavegar()
   roda antes do go() de cada item (ex.: fechar o modal), opts.limite
   corta quantos itens aparecem por grupo (a Memória mostra tudo; o
   modal de busca rápida mostra só os primeiros, para ficar compacto) */
function renderResultadosBusca(container, termo, opts){
  opts = opts || {};
  if (!termo.trim()){ container.innerHTML = '<p class="muted">Digite um termo para pesquisar em todo o seu Mega Diário.</p>'; return; }
  const blocos = blocosDeBusca(termo);
  if (!blocos.length){ container.innerHTML = `<p class="muted">Nenhum resultado para "${escapeHTML(termo)}".</p>`; return; }
  container.innerHTML = blocos.map((b,bi) => `<div class="search-group"><div class="search-group-head">${b.titulo} <span class="muted">${b.itens.length} resultado${b.itens.length===1?'':'s'}</span></div>
    <div class="attention-list">${b.itens.slice(0,opts.limite||b.itens.length).map((it,i) => { const rr = b.render(it); return `<div class="attn-item" data-b="${bi}" data-i="${i}"><div class="attn-main"><div class="attn-title">${destacarTermo(rr.titulo, termo)}</div><div class="attn-sub">${rr.data?formatDateBR(rr.data):''} ${rr.sub?'· '+escapeHTML(rr.sub):''}</div></div></div>`; }).join('')}</div></div>`).join('');
  blocos.forEach((b,bi) => container.querySelectorAll(`[data-b="${bi}"]`).forEach(el => el.addEventListener('click', () => { opts.aoNavegar?.(); b.render(b.itens[Number(el.dataset.i)]).go(); })));
}
function renderMemoria(){
  const input = document.getElementById('buscaMemoriaInput');
  const container = document.getElementById('resultadosMemoria');
  function render(){ renderResultadosBusca(container, input.value); }
  input.removeEventListener('input', input._handler || (()=>{}));
  input._handler = render;
  input.addEventListener('input', render);
  render();
}
