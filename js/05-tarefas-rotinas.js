/* ---------------------------------------------------------
   TAREFAS
   --------------------------------------------------------- */
function proximaRecorrencia(item){
  const rec = item.recorrencia;
  if (!rec || !rec.frequencia || rec.frequencia==='Única') return item.prazo || null;
  if (rec.proxima) return rec.proxima;
  const base = item.ultimaOcorrencia || item.prazo || todayISO();
  const d = parseISODate(base) || new Date();
  if (rec.frequencia==='Diária') d.setDate(d.getDate()+1);
  else if (rec.frequencia==='Semanal') d.setDate(d.getDate()+7);
  else if (rec.frequencia==='Mensal'){ const dia=Number(rec.diaMes||d.getDate()); d.setMonth(d.getMonth()+1); d.setDate(Math.min(dia,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); }
  return isoFromDate(d);
}
function proximaRecorrenciaApos(item){
  const rec = item.recorrencia; const atual = parseISODate(rec?.proxima || item.prazo || todayISO()) || new Date();
  const d = new Date(atual);
  if (rec.frequencia==='Diária') d.setDate(d.getDate()+1);
  else if (rec.frequencia==='Semanal') d.setDate(d.getDate()+7);
  else if (rec.frequencia==='Mensal'){ const dia=Number(rec.diaMes||d.getDate()); d.setMonth(d.getMonth()+1); d.setDate(Math.min(dia,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); }
  return isoFromDate(d);
}
function prazoTarefa(t){
  const prazo = t.recorrencia ? (t.recorrencia.proxima || proximaRecorrencia(t)) : t.prazo;
  if (!prazo) return {tom:'neutral', texto:'Sem prazo', data:null};
  const d = daysDiffFromToday(prazo);
  if (t.status==='Concluída' && !t.recorrencia) return {tom:'ok', texto:'Concluída', data:prazo};
  if (d<0 && !['Concluída','Cancelada'].includes(t.status)) return {tom:'danger', texto:`Atrasada · ${formatDateBR(prazo)}`, data:prazo};
  if (d===0) return {tom:'danger', texto:'Hoje', data:prazo};
  if (d<=3) return {tom:'warn', texto:`${d} dia${d===1?'':'s'} · ${formatDateBR(prazo)}`, data:prazo};
  return {tom:'neutral', texto:formatDateBR(prazo), data:prazo};
}
function tarefaAtrasada(t){
  const p = prazoTarefa(t).data;
  return p && daysDiffFromToday(p) < 0 && !['Concluída','Cancelada'].includes(t.status);
}
function badgeStatusTarefa(status){
  return ({'Pendente':'neutral','Em andamento':'primary','Concluída':'ok','Cancelada':'neutral'})[status] || 'neutral';
}
function badgePrioridade(p){
  return ({'Baixa':'neutral','Média':'primary','Alta':'warn','Urgente':'danger'})[p] || 'neutral';
}

function openFormTarefa(id, presetData){
  const item = id ? DB.getById('tarefas', id) : null;
  const rec = item?.recorrencia || {};
  const metas = DB.getAll('metas'), materias = DB.getAll('materias');
  openModal(item ? 'Editar tarefa' : 'Nova tarefa', `<form id="formTarefa"><div class="form-grid">
    <div class="field full"><label for="td_titulo">O que precisa ser feito? *</label><input class="input" id="td_titulo" required value="${escapeHTML(item?.titulo||'')}"></div>
    <div class="field"><label for="td_prioridade">Prioridade</label><select class="input" id="td_prioridade">${['Baixa','Média','Alta','Urgente'].map(x=>`<option ${(item?.prioridade||'Média')===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="td_categoria">Categoria</label><input class="input" id="td_categoria" value="${escapeHTML(item?.categoria||'')}" placeholder="Ex.: pessoal, estudos, saúde"></div>
    <div class="field"><label for="td_prazo">Data *</label><input class="input" type="date" id="td_prazo" required value="${item?.prazo||presetData||todayISO()}"></div>
    <div class="field"><label for="td_horario">Horário (opcional)</label><input class="input" type="time" id="td_horario" value="${escapeHTML(rec.horario||item?.horario||'')}"></div>
    <div class="field"><label for="td_frequencia">Repetição</label><select class="input" id="td_frequencia">${['Única','Diária','Semanal','Mensal'].map(x=>`<option ${(rec.frequencia||'Única')===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="td_tempo">Tempo estimado (min, opcional)</label><input class="input" type="number" min="0" id="td_tempo" value="${item?.tempoEstimadoMin||''}"></div>
    ${selectRelacaoHTML({id:'td_meta', label:'Meta relacionada (opcional)', itens: metas.map(m=>({id:m.id,nome:m.titulo})), valorAtual:item?.metaId, vazio:'Nenhuma meta'})}
    ${selectRelacaoHTML({id:'td_materia', label:'Matéria relacionada (opcional)', itens: materias.map(m=>({id:m.id,nome:m.nome})), valorAtual:item?.materiaId, vazio:'Nenhuma matéria'})}
    <div class="field full"><label for="td_obs">Observações</label><textarea id="td_obs">${escapeHTML(item?.observacao||'')}</textarea></div>
  </div><p class="field-error" id="tdErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="tdCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar tarefa'}</button></div></form>`);
  document.getElementById('tdCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formTarefa'), () => {
    const titulo = document.getElementById('td_titulo').value.trim();
    if (!titulo){ const er=document.getElementById('tdErro'); er.hidden=false; er.textContent='Informe o que precisa ser feito.'; return; }
    const freq = document.getElementById('td_frequencia').value;
    const prazo = document.getElementById('td_prazo').value;
    const recDados = freq==='Única' ? null : {frequencia:freq, horario:document.getElementById('td_horario').value||null, proxima: item?.recorrencia?.proxima||prazo};
    const dados = {
      titulo, prioridade: document.getElementById('td_prioridade').value,
      categoria: document.getElementById('td_categoria').value.trim(),
      horario: document.getElementById('td_horario').value,
      prazo, status: item?.status==='Concluída' && !recDados ? 'Concluída' : (item?.status||'Pendente'),
      observacao: document.getElementById('td_obs').value.trim(),
      recorrencia: recDados,
      tempoEstimadoMin: Number(document.getElementById('td_tempo').value)||null,
      metaId: document.getElementById('td_meta').value || null,
      materiaId: document.getElementById('td_materia').value || null
    };
    if (item){
      DB.update('tarefas', item.id, dados);
      registrarHistorico({modulo:'tarefas', acao:'edição', descricao:`Tarefa "${dados.titulo}" editada.`, refId:item.id});
      showToast('✓ Tarefa atualizada.');
    } else {
      const nova = {id: DB.nextId('TAR','tarefa'), ...dados, criadoEm: Date.now(), atualizadoEm: Date.now()};
      DB.insert('tarefas', nova);
      registrarHistorico({modulo:'tarefas', acao:'criação', descricao:`Tarefa "${nova.titulo}" criada.`, refId:nova.id});
      showToast('✓ Tarefa criada.');
    }
    closeModal(); renderCurrentView();
  });
}
function concluirTarefa(id){
  const item = DB.getById('tarefas', id); if (!item) return;
  if (item.recorrencia){
    const atual = item.recorrencia.proxima || item.prazo || todayISO();
    const next = proximaRecorrenciaApos({...item, recorrencia:{...item.recorrencia, proxima:atual}});
    DB.update('tarefas', id, {ultimaOcorrencia:atual, recorrencia:{...item.recorrencia, proxima:next}, status:'Pendente'});
    registrarHistorico({modulo:'tarefas', acao:'conclusão', descricao:`Tarefa "${item.titulo}" realizada. Próxima: ${formatDateBR(next)}.`, refId:id});
    showToast(`✓ Feito. Próxima vez: ${formatDateBR(next)}`);
  } else {
    DB.update('tarefas', id, {status:'Concluída', dataConclusao: todayISO()});
    registrarHistorico({modulo:'tarefas', acao:'conclusão', descricao:`Tarefa "${item.titulo}" concluída.`, refId:id});
    showToast('✓ Tarefa concluída.');
  }
  if (item.metaId && typeof registrarSnapshotProgressoMeta === 'function') registrarSnapshotProgressoMeta(item.metaId);
  renderCurrentView();
}
function renderTarefas(){
  const filtros = getFiltrosValores('filtrosTarefas');
  let lista = DB.getAll('tarefas');
  if (filtros.busca){ const q=filtros.busca.toLowerCase(); lista = lista.filter(t=>[t.titulo,t.categoria,t.observacao].join(' ').toLowerCase().includes(q)); }
  if (filtros.status) lista = lista.filter(t => (t.status||'Pendente') === filtros.status);
  if (filtros.prioridade) lista = lista.filter(t => t.prioridade === filtros.prioridade);
  lista.sort((a,b) => { const da=prazoTarefa(a).data, db=prazoTarefa(b).data; return (da?parseISODate(da).getTime():Infinity) - (db?parseISODate(db).getTime():Infinity); });

  const box = document.getElementById('listaTarefas');
  const vazio = document.getElementById('vazioTarefas');
  const semFiltro = !filtros.busca && !filtros.status && !filtros.prioridade;
  vazio.hidden = lista.length !== 0;
  if (!lista.length){
    vazio.innerHTML = semFiltro ? 'Você ainda não possui tarefas. Crie a primeira e comece a organizar o que precisa ser feito. <button class="btn btn-sm btn-primary" id="vazioTarefasBtn" style="margin-top:8px">＋ Nova tarefa</button>' : 'Nenhuma tarefa encontrada com esses filtros.';
    document.getElementById('vazioTarefasBtn')?.addEventListener('click', () => openFormTarefa());
  }
  box.innerHTML = lista.map(t => { const pz = prazoTarefa(t); const recorr = !!t.recorrencia;
    const atrasada = tarefaAtrasada(t);
    const motivo = atrasada ? motivoDoItem('tarefa', t.id, pz.data) : null;
    return `<article class="activity-card ${atrasada?'is-late':''}" data-id="${t.id}">
      <div class="activity-main"><div class="activity-title-row"><span class="activity-icon">${recorr?'🔄':'✅'}</span><div><div class="activity-title">${escapeHTML(t.titulo)}</div>
        <div class="activity-meta"><span class="badge-pill badge-${recorr?'warn':'primary'}">${t.recorrencia?.frequencia||'Única'}</span>${t.categoria?`<span>🏷️ ${escapeHTML(t.categoria)}</span>`:''}</div></div></div>
        <div class="activity-description">${escapeHTML(t.observacao||'Sem observações')}${motivo?`<br><em>❓ ${escapeHTML(motivo.motivo)}${motivo.motivoLivre?': '+escapeHTML(motivo.motivoLivre):''}</em>`:''}</div></div>
      <div class="activity-side"><div>${badgeHTML(badgePrioridade(t.prioridade),t.prioridade)}</div><div>${badgeHTML(pz.tom,pz.texto)}</div></div>
      <div class="activity-actions">${atrasada?`<button class="btn btn-sm" data-act="motivo">❓ ${motivo?'Editar motivo':'Motivo'}</button>`:''}<button class="btn btn-sm btn-primary" data-act="concluir">${recorr?'✓ Fiz hoje':'✓ Concluir'}</button><button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
    </article>`;
  }).join('');
  box.querySelectorAll('.activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="concluir"]').onclick = () => concluirTarefa(id);
    card.querySelector('[data-act="editar"]').onclick = () => openFormTarefa(id);
    card.querySelector('[data-act="motivo"]')?.addEventListener('click', () => {
      const t = DB.getById('tarefas', id);
      abrirFormMotivo('tarefa', id, prazoTarefa(t).data, t.titulo, () => renderTarefas());
    });
    card.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Excluir esta tarefa?', () => {
      const t = DB.getById('tarefas', id); DB.remove('tarefas', id);
      registrarHistorico({modulo:'tarefas', acao:'exclusão', descricao:`Tarefa "${t.titulo}" excluída.`, refId:id});
      showToast('Tarefa excluída.'); renderTarefas();
    });
  });
}
document.querySelectorAll('#filtrosTarefas [data-filter]').forEach(el => el.addEventListener('input', renderTarefas));
document.querySelector('[data-action="nova-tarefa"]').addEventListener('click', () => openFormTarefa());

/* ---------------------------------------------------------
   ROTINAS — gera ocorrências dinamicamente, sem duplicar registros
   --------------------------------------------------------- */
function rotinaOcorreEm(rotina, iso){
  if (!rotina.ativo) return false;
  const freq = rotina.recorrencia?.frequencia;
  const d = parseISODate(iso);
  if (freq === 'diaria') return true;
  if (freq === 'dias_semana') return (rotina.recorrencia.diasSemana||[]).includes(d.getDay());
  if (freq === 'semanal') return d.getDay() === Number(rotina.recorrencia.diaSemana ?? 1);
  if (freq === 'mensal') return d.getDate() === Number(rotina.recorrencia.diaMes ?? 1);
  return false;
}
function ocorrenciasRotinas(inicioIso, fimIso){
  const rotinas = DB.getAll('rotinas').filter(r => r.ativo);
  const ocorrencias = [];
  let d = parseISODate(inicioIso);
  const fim = parseISODate(fimIso);
  while (d <= fim){
    const iso = isoFromDate(d);
    rotinas.forEach(r => {
      const desde = r.criadoEm ? isoFromDate(new Date(r.criadoEm)) : iso;
      if (iso >= desde && rotinaOcorreEm(r, iso)) ocorrencias.push({id:`ROT-${r.id}-${iso}`, rotinaId:r.id, titulo:r.titulo, categoria:r.categoria, horario:r.horario||'', data:iso});
    });
    d.setDate(d.getDate()+1);
  }
  return ocorrencias;
}
const DIAS_SEMANA_LABELS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
function openFormRotina(id){
  const item = id ? DB.getById('rotinas', id) : null;
  const rec = item?.recorrencia || {frequencia:'diaria'};
  openModal(item ? 'Editar rotina' : 'Nova rotina', `<form id="formRotina"><div class="form-grid">
    <div class="field full"><label for="rt_titulo">O que você quer fazer com frequência? *</label><input class="input" id="rt_titulo" required value="${escapeHTML(item?.titulo||'')}" placeholder="Ex.: Estudar, Treinar, Ler..."></div>
    <div class="field"><label for="rt_categoria">Categoria</label><input class="input" id="rt_categoria" value="${escapeHTML(item?.categoria||'')}"></div>
    <div class="field"><label for="rt_horario">Horário (opcional)</label><input class="input" type="time" id="rt_horario" value="${escapeHTML(item?.horario||'')}"></div>
    <div class="field"><label for="rt_frequencia">Frequência</label><select class="input" id="rt_frequencia">
      <option value="diaria" ${rec.frequencia==='diaria'?'selected':''}>Diariamente</option>
      <option value="dias_semana" ${rec.frequencia==='dias_semana'?'selected':''}>Em dias específicos da semana</option>
      <option value="semanal" ${rec.frequencia==='semanal'?'selected':''}>Semanalmente</option>
      <option value="mensal" ${rec.frequencia==='mensal'?'selected':''}>Mensalmente</option>
    </select></div>
    <div class="field full" id="rtDiasSemanaBox"><label>Dias da semana</label><div style="display:flex;flex-wrap:wrap;gap:8px">${DIAS_SEMANA_LABELS.map((l,i)=>`<label style="display:flex;align-items:center;gap:4px;font-size:12.5px"><input type="checkbox" class="rt-dia" value="${i}" ${(rec.diasSemana||[]).includes(i)?'checked':''}>${l}</label>`).join('')}</div></div>
    <div class="field" id="rtDiaMesBox"><label for="rt_diaMes">Dia do mês</label><input class="input" type="number" min="1" max="31" id="rt_diaMes" value="${rec.diaMes||new Date().getDate()}"></div>
  </div><p class="field-error" id="rtErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="rtCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar rotina'}</button></div></form>`);
  const freqEl = document.getElementById('rt_frequencia'), diasBox = document.getElementById('rtDiasSemanaBox'), mesBox = document.getElementById('rtDiaMesBox');
  function toggle(){ diasBox.style.display = freqEl.value==='dias_semana'?'block':'none'; mesBox.style.display = freqEl.value==='mensal'?'flex':'none'; }
  freqEl.addEventListener('change', toggle); toggle();
  document.getElementById('rtCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formRotina'), () => {
    const titulo = document.getElementById('rt_titulo').value.trim();
    if (!titulo){ const er=document.getElementById('rtErro'); er.hidden=false; er.textContent='Informe a atividade.'; return; }
    const freq = freqEl.value;
    const recorrencia = {frequencia:freq};
    if (freq==='dias_semana') recorrencia.diasSemana = [...document.querySelectorAll('.rt-dia:checked')].map(c=>Number(c.value));
    if (freq==='mensal') recorrencia.diaMes = Number(document.getElementById('rt_diaMes').value)||1;
    const dados = {titulo, categoria: document.getElementById('rt_categoria').value.trim(), horario: document.getElementById('rt_horario').value, recorrencia, ativo: item?.ativo ?? true};
    if (item){ DB.update('rotinas', item.id, dados); showToast('✓ Rotina atualizada.'); }
    else {
      const nova = {id: DB.nextId('ROT','rotina'), ...dados, criadoEm: Date.now()};
      DB.insert('rotinas', nova);
      registrarHistorico({modulo:'rotinas', acao:'criação', descricao:`Rotina "${nova.titulo}" criada.`, refId:nova.id});
      showToast('✓ Rotina criada.');
    }
    closeModal(); renderCurrentView();
  });
}
function renderRotinas(){
  const lista = DB.getAll('rotinas');
  const box = document.getElementById('listaRotinas');
  const vazio = document.getElementById('vazioRotinas');
  vazio.hidden = lista.length !== 0;
  if (!lista.length) vazio.innerHTML = 'Você ainda não tem rotinas. Cadastre atividades que se repetem — estudar, treinar, ler — e elas aparecem sozinhas na Agenda e no Meu Dia. <button class="btn btn-sm btn-primary" id="vazioRotinasBtn" style="margin-top:8px">＋ Criar primeira rotina</button>';
  if (!lista.length) document.getElementById('vazioRotinasBtn').onclick = () => openFormRotina();
  const hoje = todayISO();
  const freqLabel = r => ({diaria:'Diariamente', dias_semana:(r.recorrencia.diasSemana||[]).map(d=>DIAS_SEMANA_LABELS[d].slice(0,3)).join(', '), semanal:'Semanalmente', mensal:`Todo dia ${r.recorrencia.diaMes}`})[r.recorrencia.frequencia];
  box.innerHTML = lista.map(r => {
    const ocorreHoje = rotinaOcorreEm(r, hoje) && r.ativo;
    const feita = rotinaConcluidaEm(r.id, hoje);
    return `<div class="panel" data-id="${r.id}" style="margin-bottom:0;${r.ativo?'':'opacity:.55'}">
    <div class="panel-head"><h2>🔄 ${escapeHTML(r.titulo)}</h2></div>
    <div class="muted" style="font-size:12.5px;margin-bottom:10px">${freqLabel(r)}${r.horario?' · '+r.horario:''}${r.categoria?' · '+escapeHTML(r.categoria):''}</div>
    ${ocorreHoje ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:10px"><input type="checkbox" data-act="hoje" ${feita?'checked':''}> Feita hoje</label>` : ''}
    <div class="activity-actions"><button class="btn btn-sm" data-act="toggle">${r.ativo?'Pausar':'Ativar'}</button><button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
  </div>`;
  }).join('');
  box.querySelectorAll('[data-id]').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="toggle"]').onclick = () => { const r=DB.getById('rotinas',id); DB.update('rotinas',id,{ativo:!r.ativo}); renderRotinas(); };
    card.querySelector('[data-act="editar"]').onclick = () => openFormRotina(id);
    card.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Excluir esta rotina?', () => { DB.remove('rotinas', id); showToast('Rotina excluída.'); renderRotinas(); });
    card.querySelector('[data-act="hoje"]')?.addEventListener('change', () => { toggleRotinaConcluida(id, hoje); showToast('✓ Atualizado.'); renderRotinas(); });
  });
}
document.querySelector('[data-action="nova-rotina"]').addEventListener('click', () => openFormRotina());
