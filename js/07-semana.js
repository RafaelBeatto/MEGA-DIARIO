/* ---------------------------------------------------------
   SEMANA — planejamento semanal + fluxo de domingo
   --------------------------------------------------------- */
let semanaAtualInicio = mondayOf(todayISO());

function getSemana(mondayIso){ return DB.getById('semanas', mondayIso); }
function getOrCreateSemana(mondayIso){
  let semana = getSemana(mondayIso);
  if (!semana){
    semana = { id: mondayIso, inicio: mondayIso, fim: addDaysISO(mondayIso,6), objetivos: [], revisao: null, planejamento: null, criadoEm: Date.now(), atualizadoEm: Date.now() };
    DB.insert('semanas', semana);
  }
  return semana;
}
function salvarSemana(mondayIso, patch){ getOrCreateSemana(mondayIso); return DB.update('semanas', mondayIso, patch); }

function openFormObjetivoSemana(objetivoId){
  const semana = getOrCreateSemana(semanaAtualInicio);
  const objetivo = objetivoId ? semana.objetivos.find(o => o.id === objetivoId) : null;
  openModal(objetivo ? 'Editar objetivo da semana' : 'Novo objetivo da semana', `<form id="formObjetivoSemana"><div class="form-grid">
    <div class="field full"><label for="ob_titulo">Objetivo *</label><input class="input" id="ob_titulo" required value="${escapeHTML(objetivo?.titulo||'')}" placeholder="Ex.: Estudar para o concurso"></div>
    <div class="field"><label for="ob_prioridade">Prioridade</label><select class="input" id="ob_prioridade">${['Baixa','Média','Alta'].map(p=>`<option ${(objetivo?.prioridade||'Média')===p?'selected':''}>${p}</option>`).join('')}</select></div>
    <div class="field"><label for="ob_progresso">Progresso (%)</label><input class="input" type="number" min="0" max="100" id="ob_progresso" value="${objetivo?.progresso||0}"></div>
    <div class="field full"><label for="ob_descricao">Descrição</label><textarea id="ob_descricao">${escapeHTML(objetivo?.descricao||'')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="obCancelar">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div></form>`);
  document.getElementById('obCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formObjetivoSemana'), () => {
    const titulo = document.getElementById('ob_titulo').value.trim(); if (!titulo) return;
    const progresso = clamp(Number(document.getElementById('ob_progresso').value)||0, 0, 100);
    const dados = {titulo, prioridade: document.getElementById('ob_prioridade').value, progresso, descricao: document.getElementById('ob_descricao').value.trim(), status: progresso>=100?'Concluído':'Em andamento'};
    const objetivos = [...semana.objetivos];
    if (objetivo){ const idx = objetivos.findIndex(o=>o.id===objetivo.id); objetivos[idx] = {...objetivos[idx], ...dados}; }
    else objetivos.push({id:uid('OBJ'), ...dados});
    salvarSemana(semanaAtualInicio, {objetivos});
    showToast('✓ Objetivo salvo.'); closeModal(); renderSemana();
  });
}
function excluirObjetivoSemana(objetivoId){
  const semana = getOrCreateSemana(semanaAtualInicio);
  salvarSemana(semanaAtualInicio, {objetivos: semana.objetivos.filter(o=>o.id!==objetivoId)});
  showToast('Objetivo removido.'); renderSemana();
}

function renderSemana(){
  const semana = getOrCreateSemana(semanaAtualInicio);
  document.getElementById('semanaTitulo').textContent = tituloSemana(semanaAtualInicio);
  const dias = diasDaSemana(semanaAtualInicio);
  const sessoes = DB.getAll('sessoes').filter(s => mondayOf(s.data) === semanaAtualInicio);
  const tarefas = DB.getAll('tarefas').map(t=>({...t,_data:prazoTarefa(t).data})).filter(t => t._data && mondayOf(t._data) === semanaAtualInicio);
  const compromissos = itemsAgenda(dias[0], dias[6]).filter(i => i._origem === 'evento');

  const box = document.getElementById('semanaConteudo');
  box.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>🎯 Objetivos da semana</h2><button class="btn btn-sm btn-primary" id="semNovoObjetivo">＋ Objetivo</button></div>
      ${semana.objetivos.length ? semana.objetivos.map(o => `
        <div class="attn-item" data-obj="${o.id}"><div class="attn-dot" style="background:${o.status==='Concluído'?'var(--ok)':'var(--warn)'}"></div>
          <div class="attn-main"><div class="attn-title">${escapeHTML(o.titulo)} ${badgeHTML(badgePrioridade(o.prioridade),o.prioridade)}</div><div class="attn-sub">${escapeHTML(o.descricao||'')} · Progresso: ${o.progresso||0}%</div></div>
          <div class="activity-actions"><button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
        </div>`).join('') : '<p class="muted">Nenhum objetivo definido para esta semana ainda.</p>'}
    </div>

    <div class="panel">
      <div class="panel-head"><h2>📚 Estudos da semana</h2></div>
      <div class="week-mini-grid">${dias.map(iso => {
        const doDia = sessoes.filter(s => s.data === iso);
        return `<div class="week-mini-day ${iso===todayISO()?'is-today':''}">
          <div class="week-mini-day-head">${nomeDiaCurto(iso).slice(0,3)}<br><strong>${parseISODate(iso).getDate()}</strong></div>
          <div class="week-mini-day-items">${doDia.map(s => `<button type="button" class="agenda-chip is-estudo ${s.status==='Realizada'?'is-done':''}" data-ses="${s.id}">${s.horarioInicio?s.horarioInicio+' ':''}${escapeHTML(nomeMateria(s.materiaId))} — ${escapeHTML(s.assunto)}</button>`).join('') || ''}
          <button type="button" class="btn btn-sm btn-ghost" data-plan-estudo="${iso}" style="margin-top:4px;width:100%">＋ Planejar</button></div>
        </div>`;
      }).join('')}</div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>✅ Tarefas da semana</h2></div>
      <div class="week-mini-grid">${dias.map(iso => {
        const doDia = tarefas.filter(t => t._data === iso);
        return `<div class="week-mini-day ${iso===todayISO()?'is-today':''}">
          <div class="week-mini-day-head">${nomeDiaCurto(iso).slice(0,3)}<br><strong>${parseISODate(iso).getDate()}</strong></div>
          <div class="week-mini-day-items">${doDia.map(t => `<button type="button" class="agenda-chip is-tarefa ${t.status==='Concluída'?'is-done':''}" data-tar="${t.id}">${escapeHTML(t.titulo)}</button>`).join('')}
          <button type="button" class="btn btn-sm btn-ghost" data-plan-tarefa="${iso}" style="margin-top:4px;width:100%">＋ Tarefa</button></div>
        </div>`;
      }).join('')}</div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>🗓️ Compromissos e eventos da semana</h2></div>
      ${compromissos.length ? `<div class="activity-list">${compromissos.map(c => `<div class="activity-row"><span class="activity-time">${formatDateBR(c.data).slice(0,5)} ${c.horarioInicio||''}</span><span>${agendaItemChip(c)}</span></div>`).join('')}</div>` : '<p class="muted">Nenhum compromisso cadastrado para esta semana. Registre na Agenda e ele aparece aqui automaticamente.</p>'}
    </div>`;

  document.getElementById('semNovoObjetivo').onclick = () => openFormObjetivoSemana();
  box.querySelectorAll('[data-obj]').forEach(el => {
    const id = el.dataset.obj;
    el.querySelector('[data-act="editar"]').onclick = () => openFormObjetivoSemana(id);
    el.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Remover este objetivo?', () => excluirObjetivoSemana(id));
  });
  box.querySelectorAll('[data-ses]').forEach(el => el.addEventListener('click', () => openFormSessaoEstudo(el.dataset.ses)));
  box.querySelectorAll('[data-tar]').forEach(el => el.addEventListener('click', () => openFormTarefa(el.dataset.tar)));
  box.querySelectorAll('[data-plan-estudo]').forEach(el => el.addEventListener('click', () => openFormSessaoEstudo(null, el.dataset.planEstudo, 'Planejada')));
  box.querySelectorAll('[data-plan-tarefa]').forEach(el => el.addEventListener('click', () => openFormTarefa(null, el.dataset.planTarefa)));
  agendaBindChips(box, compromissos);
}
document.getElementById('semanaPrev').addEventListener('click', () => { semanaAtualInicio = addDaysISO(semanaAtualInicio, -7); renderSemana(); });
document.getElementById('semanaNext').addEventListener('click', () => { semanaAtualInicio = addDaysISO(semanaAtualInicio, 7); renderSemana(); });
document.getElementById('semanaHojeBtn').addEventListener('click', () => { semanaAtualInicio = mondayOf(todayISO()); renderSemana(); });

/* ---------- fluxo guiado de domingo ---------- */
const PERGUNTAS_REVISAO = [
  ['consegui','O que eu consegui fazer?'], ['pendente','O que ficou pendente?'], ['aprendi','O que eu aprendi?'],
  ['deuCerto','O que deu certo?'], ['melhorar','O que preciso melhorar?'], ['levarProxima','O que preciso levar para a próxima semana?']
];
const PERGUNTAS_PLANEJAMENTO = [
  ['objetivos','Quais são meus principais objetivos?'], ['estudar','O que preciso estudar?'], ['tarefas','Quais tarefas preciso fazer?'],
  ['compromissos','Quais compromissos já tenho?'], ['naoEsquecer','O que não posso esquecer?'], ['melhorar','O que quero melhorar nesta semana?']
];
function abrirFluxoDomingo(){
  const semanaAtual = getOrCreateSemana(semanaAtualInicio);
  const proximaId = addDaysISO(semanaAtualInicio, 7);
  const proxima = getOrCreateSemana(proximaId);
  openModal('Revisão da semana + Planejamento da próxima', `
    <div class="diario-tabs" id="domingoTabs"><button class="diario-tab is-active" data-step="1">1. Revisão</button><button class="diario-tab" data-step="2">2. Planejamento</button></div>
    <form id="formDomingo">
      <div data-step-body="1"><p class="muted" style="margin-bottom:10px">Sobre a ${tituloSemana(semanaAtualInicio).toLowerCase()}, que está terminando:</p>
        <div class="form-grid">${PERGUNTAS_REVISAO.map(([k,label]) => `<div class="field full"><label for="dom_rev_${k}">${label}</label><textarea id="dom_rev_${k}">${escapeHTML(semanaAtual.revisao?.[k]||'')}</textarea></div>`).join('')}</div>
      </div>
      <div data-step-body="2" hidden><p class="muted" style="margin-bottom:10px">Planejando a ${tituloSemana(proximaId).toLowerCase()}:</p>
        <div class="form-grid">${PERGUNTAS_PLANEJAMENTO.map(([k,label]) => `<div class="field full"><label for="dom_plan_${k}">${label}</label><textarea id="dom_plan_${k}">${escapeHTML(proxima.planejamento?.[k]||'')}</textarea></div>`).join('')}</div>
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" id="domCancelar">Cancelar</button><button type="button" class="btn" id="domVoltar" hidden>‹ Voltar</button><button type="button" class="btn btn-primary" id="domAvancar">Avançar ›</button><button type="submit" class="btn btn-primary" id="domSalvar" hidden>Salvar e ir para a próxima semana</button></div>
    </form>`);
  let passo = 1;
  const body1 = document.querySelector('[data-step-body="1"]'), body2 = document.querySelector('[data-step-body="2"]');
  function atualizarPasso(){
    body1.hidden = passo !== 1; body2.hidden = passo !== 2;
    document.querySelectorAll('#domingoTabs .diario-tab').forEach(t => t.classList.toggle('is-active', Number(t.dataset.step)===passo));
    document.getElementById('domVoltar').hidden = passo === 1;
    document.getElementById('domAvancar').hidden = passo === 2;
    document.getElementById('domSalvar').hidden = passo === 1;
  }
  document.getElementById('domAvancar').onclick = () => { passo = 2; atualizarPasso(); };
  document.getElementById('domVoltar').onclick = () => { passo = 1; atualizarPasso(); };
  document.querySelectorAll('#domingoTabs .diario-tab').forEach(t => t.addEventListener('click', () => { passo = Number(t.dataset.step); atualizarPasso(); }));
  document.getElementById('domCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formDomingo'), () => {
    const revisao = {}; PERGUNTAS_REVISAO.forEach(([k]) => revisao[k] = document.getElementById(`dom_rev_${k}`).value.trim());
    const planejamento = {}; PERGUNTAS_PLANEJAMENTO.forEach(([k]) => planejamento[k] = document.getElementById(`dom_plan_${k}`).value.trim());
    salvarSemana(semanaAtualInicio, {revisao});
    salvarSemana(proximaId, {planejamento});
    registrarHistorico({modulo:'semana', acao:'revisão', descricao:'Revisão da semana e planejamento da próxima semana registrados.', refId:semanaAtualInicio});
    showToast('✓ Revisão e planejamento salvos.');
    closeModal();
    semanaAtualInicio = proximaId;
    renderSemana();
  });
  atualizarPasso();
}
document.getElementById('btnFluxoDomingo').addEventListener('click', abrirFluxoDomingo);
