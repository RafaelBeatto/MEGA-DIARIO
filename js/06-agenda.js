/* ---------------------------------------------------------
   AGENDA — unifica eventos, estudos, tarefas, rotinas e prazos de
   metas. Nada é duplicado: cada registro só existe no seu módulo.
   --------------------------------------------------------- */
function itemsAgenda(inicioIso, fimIso){
  const dentro = iso => !!iso && iso >= inicioIso && iso <= fimIso;
  const eventos = DB.getAll('eventos').filter(e => dentro(e.data)).map(e => ({
    _origem:'evento', _id:e.id, id:`EV-${e.id}`, titulo:e.titulo, tipo:e.tipo||'Compromisso',
    data:e.data, horarioInicio:e.horarioInicio||'', horarioFim:e.horarioFim||'', local:e.local||'', concluido:!!e.concluido
  }));
  const sessoes = DB.getAll('sessoes').filter(s => dentro(s.data)).map(s => ({
    _origem:'sessao', _id:s.id, id:`SES-${s.id}`, titulo:`📚 ${nomeMateria(s.materiaId)} — ${s.assunto}`, tipo:'Estudo',
    data:s.data, horarioInicio:s.horarioInicio||'', horarioFim:s.horarioFim||'', local:'', concluido:s.status==='Realizada'
  }));
  const tarefas = DB.getAll('tarefas').map(t => ({...t, _dataCalc: prazoTarefa(t).data})).filter(t => dentro(t._dataCalc)).map(t => ({
    _origem:'tarefa', _id:t.id, id:`TAR-${t.id}`, titulo:`✅ ${t.titulo}`, tipo:'Tarefa',
    data:t._dataCalc, horarioInicio:t.horario||'', horarioFim:'', local:'', concluido:t.status==='Concluída'
  }));
  const rotinas = ocorrenciasRotinas(inicioIso, fimIso).map(r => ({
    _origem:'rotina', _id:r.rotinaId, id:r.id, titulo:`🔄 ${r.titulo}`, tipo:'Rotina',
    data:r.data, horarioInicio:r.horario||'', horarioFim:'', local:'', concluido:false
  }));
  const metas = DB.getAll('metas').filter(m => dentro(m.prazo)).map(m => ({
    _origem:'meta', _id:m.id, id:`META-${m.id}`, titulo:`🎯 Prazo: ${m.titulo}`, tipo:'Meta',
    data:m.prazo, horarioInicio:'', horarioFim:'', local:'', concluido:m.status==='Concluída'
  }));
  return [...eventos, ...sessoes, ...tarefas, ...rotinas, ...metas].sort((a,b) => (a.horarioInicio||'99:99').localeCompare(b.horarioInicio||'99:99'));
}
function itemsDoDia(iso){ return itemsAgenda(iso, iso); }

function abrirItemAgenda(item){
  if (item._origem === 'evento') abrirDetalheEvento(item._id);
  else if (item._origem === 'sessao') openFormSessaoEstudo(item._id);
  else if (item._origem === 'tarefa') openFormTarefa(item._id);
  else if (item._origem === 'rotina') openFormRotina(item._id);
  else if (item._origem === 'meta') abrirDetalheMeta(item._id);
  else if (item._origem === 'registro') abrirDetalheRegistroDiario(item._id);
}

function openFormEvento(id, presetData){
  const item = id ? DB.getById('eventos', id) : null;
  openModal(item ? 'Editar compromisso' : 'Novo compromisso', `<form id="formEvento"><div class="form-grid">
    <div class="field full"><label for="ev_titulo">Título *</label><input class="input" id="ev_titulo" required value="${escapeHTML(item?.titulo||'')}"></div>
    <div class="field"><label for="ev_tipo">Tipo</label><select class="input" id="ev_tipo">${['Compromisso','Lazer','Saúde','Social','Outro'].map(t=>`<option ${(item?.tipo||'Compromisso')===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="ev_data">Data *</label><input class="input" type="date" id="ev_data" required value="${item?.data||presetData||todayISO()}"></div>
    <div class="field"><label for="ev_inicio">Horário início</label><input class="input" type="time" id="ev_inicio" value="${item?.horarioInicio||''}"></div>
    <div class="field"><label for="ev_fim">Horário fim</label><input class="input" type="time" id="ev_fim" value="${item?.horarioFim||''}"></div>
    <div class="field"><label for="ev_local">Local</label><input class="input" id="ev_local" value="${escapeHTML(item?.local||'')}"></div>
    <div class="field full"><label for="ev_desc">Descrição</label><textarea id="ev_desc">${escapeHTML(item?.descricao||'')}</textarea></div>
  </div><p class="field-error" id="evErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="evCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar compromisso'}</button></div></form>`);
  document.getElementById('evCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formEvento'), () => {
    const titulo = document.getElementById('ev_titulo').value.trim();
    if (!titulo){ const er=document.getElementById('evErro'); er.hidden=false; er.textContent='Informe o título.'; return; }
    const dados = {
      titulo, tipo: document.getElementById('ev_tipo').value, data: document.getElementById('ev_data').value || todayISO(),
      horarioInicio: document.getElementById('ev_inicio').value, horarioFim: document.getElementById('ev_fim').value,
      local: document.getElementById('ev_local').value.trim(), descricao: document.getElementById('ev_desc').value.trim(),
      concluido: item?.concluido || false
    };
    if (item){ DB.update('eventos', item.id, dados); showToast('✓ Compromisso atualizado.'); }
    else {
      const novo = {id: DB.nextId('EVT','evento'), ...dados, criadoEm: Date.now()};
      DB.insert('eventos', novo);
      registrarHistorico({modulo:'agenda', acao:'criação', descricao:`Compromisso "${novo.titulo}" criado.`, refId:novo.id});
      showToast('✓ Compromisso criado.');
    }
    closeModal(); renderCurrentView();
  });
}
function abrirDetalheEvento(id){
  const e = DB.getById('eventos', id); if (!e) return;
  openModal(escapeHTML(e.titulo), `<div class="form-grid">
    <div class="detail-block"><div class="detail-label">Data</div><div class="detail-value">${formatDateBR(e.data)}${e.horarioInicio?' · '+e.horarioInicio:''}${e.horarioFim?' — '+e.horarioFim:''}</div></div>
    <div class="detail-block"><div class="detail-label">Local</div><div class="detail-value">${escapeHTML(e.local||'—')}</div></div></div>
    <div class="detail-block"><div class="detail-label">Descrição</div><div class="detail-value">${escapeHTML(e.descricao||'—')}</div></div>
    <div class="modal-actions"><button class="btn btn-ghost" id="evFechar">Fechar</button><button class="btn btn-danger" id="evExcluir">Excluir</button><button class="btn ${e.concluido?'':'btn-primary'}" id="evConcluir">${e.concluido?'↩ Reabrir':'✓ Concluir'}</button><button class="btn btn-primary" id="evEditar">Editar</button></div>`);
  document.getElementById('evFechar').onclick = closeModal;
  document.getElementById('evEditar').onclick = () => openFormEvento(id);
  document.getElementById('evConcluir').onclick = () => { DB.update('eventos', id, {concluido:!e.concluido}); showToast(e.concluido?'↩ Reaberto.':'✓ Concluído.'); closeModal(); renderCurrentView(); };
  document.getElementById('evExcluir').onclick = () => confirmAction('Excluir este compromisso?', () => { DB.remove('eventos', id); showToast('Excluído.'); closeModal(); renderCurrentView(); });
}

let agendaData = new Date();
let agendaModo = 'semana';

function agendaItemChip(item){
  return `<button type="button" class="agenda-chip is-${item.tipo.toLowerCase()} ${item.concluido?'is-done':''}" data-item="${item.id}">${item.horarioInicio?`<strong>${item.horarioInicio}</strong> `:''}${escapeHTML(item.titulo)}</button>`;
}
function agendaBindChips(container, items){
  container.querySelectorAll('[data-item]').forEach(btn => {
    const item = items.find(i => i.id === btn.dataset.item);
    if (item) btn.addEventListener('click', () => abrirItemAgenda(item));
  });
}
function renderAgendaDia(){
  const iso = isoFromDate(agendaData);
  document.getElementById('agendaTitulo').textContent = parseISODate(iso).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  const itens = itemsDoDia(iso);
  const box = document.getElementById('agendaConteudo');
  box.innerHTML = `<div class="panel">${itens.length ? itens.map(i => `<div class="activity-row"><span class="activity-time">${i.horarioInicio||'—'}</span><span>${agendaItemChip(i)}</span></div>`).join('') : '<p class="muted">Nada agendado para este dia.</p>'}</div>`;
  agendaBindChips(box, itens);
}
function renderAgendaSemana(){
  const monday = mondayOf(isoFromDate(agendaData));
  const dias = diasDaSemana(monday);
  document.getElementById('agendaTitulo').textContent = tituloSemana(monday);
  const itens = itemsAgenda(dias[0], dias[6]);
  const box = document.getElementById('agendaConteudo');
  box.innerHTML = `<div class="week-mini-grid">${dias.map(iso => {
    const doDia = itens.filter(i => i.data === iso);
    const hoje = iso === todayISO();
    return `<div class="week-mini-day ${hoje?'is-today':''}"><div class="week-mini-day-head">${nomeDiaCurto(iso).slice(0,3)}<br><strong>${parseISODate(iso).getDate()}</strong></div><div class="week-mini-day-items">${doDia.map(agendaItemChip).join('') || '<span class="muted" style="font-size:11px">—</span>'}</div></div>`;
  }).join('')}</div>`;
  agendaBindChips(box, itens);
}
function renderAgendaMes(){
  const ano = agendaData.getFullYear(), mes = agendaData.getMonth();
  document.getElementById('agendaTitulo').textContent = agendaData.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  const primeiro = new Date(ano, mes, 1);
  const inicioGrid = new Date(primeiro); inicioGrid.setDate(1 - ((primeiro.getDay()+6)%7));
  const itens = itemsAgenda(isoFromDate(inicioGrid), isoFromDate(new Date(ano,mes+1,13)));
  const box = document.getElementById('agendaConteudo');
  let html = '<div class="mini-month-grid">' + ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=>`<div class="mini-month-head">${d}</div>`).join('');
  const cursor = new Date(inicioGrid);
  for (let i=0;i<42;i++){
    const iso = isoFromDate(cursor);
    const doDia = itens.filter(it => it.data === iso);
    const foraDoMes = cursor.getMonth() !== mes;
    html += `<div class="mini-month-cell ${foraDoMes?'is-out':''} ${iso===todayISO()?'is-today':''}" data-dia="${iso}"><span>${cursor.getDate()}</span>${doDia.length ? `<span class="mini-month-dot">${doDia.length}</span>` : ''}</div>`;
    cursor.setDate(cursor.getDate()+1);
  }
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll('[data-dia]').forEach(cell => cell.addEventListener('click', () => { agendaData = parseISODate(cell.dataset.dia); agendaModo = 'dia'; document.querySelectorAll('[data-agenda-view]').forEach(x=>x.className='btn btn-sm '+(x.dataset.agendaView==='dia'?'btn-primary':'btn-ghost')); renderAgenda(); }));
}
function renderAgenda(){
  if (agendaModo === 'dia') renderAgendaDia();
  else if (agendaModo === 'mes') renderAgendaMes();
  else renderAgendaSemana();
}
document.getElementById('agendaPrev').addEventListener('click', () => {
  if (agendaModo==='dia') agendaData.setDate(agendaData.getDate()-1);
  else if (agendaModo==='mes') agendaData.setMonth(agendaData.getMonth()-1);
  else agendaData.setDate(agendaData.getDate()-7);
  renderAgenda();
});
document.getElementById('agendaNext').addEventListener('click', () => {
  if (agendaModo==='dia') agendaData.setDate(agendaData.getDate()+1);
  else if (agendaModo==='mes') agendaData.setMonth(agendaData.getMonth()+1);
  else agendaData.setDate(agendaData.getDate()+7);
  renderAgenda();
});
document.getElementById('agendaHoje').addEventListener('click', () => { agendaData = new Date(); renderAgenda(); });
document.querySelectorAll('[data-agenda-view]').forEach(b => b.addEventListener('click', () => {
  agendaModo = b.dataset.agendaView;
  document.querySelectorAll('[data-agenda-view]').forEach(x => x.className = 'btn btn-sm ' + (x===b ? 'btn-primary' : 'btn-ghost'));
  renderAgenda();
}));
document.querySelector('[data-action="novo-evento"]').addEventListener('click', () => openFormEvento());
