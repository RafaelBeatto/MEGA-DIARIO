/* ---------------------------------------------------------
   MINHAS METAS
   --------------------------------------------------------- */
function progressoMeta(m){
  if (!m.etapas || !m.etapas.length) return m.progressoManual || 0;
  const total = m.etapas.length, feitas = m.etapas.filter(e=>e.concluida).length;
  return Math.round((feitas/total)*100);
}
/* registra um "ponto" no histórico de progresso da meta — no máximo um por dia,
   para o gráfico refletir apenas mudanças reais, nunca números inventados */
function logProgressoMeta(metaId, progresso){
  const m = DB.getById('metas', metaId); if (!m) return;
  const hist = [...(m.progressoHistorico||[])];
  const hoje = todayISO();
  if (hist.length && hist[hist.length-1].data === hoje) hist[hist.length-1] = {data:hoje, progresso};
  else hist.push({data:hoje, progresso});
  DB.update('metas', metaId, {progressoHistorico: hist});
}
function registrarSnapshotProgressoMeta(metaId){
  const m = DB.getById('metas', metaId); if (!m) return;
  logProgressoMeta(metaId, progressoMeta(m));
}
function openFormMeta(id){
  const item = id ? DB.getById('metas', id) : null;
  const temEtapas = !!(item?.etapas && item.etapas.length);
  openModal(item ? 'Editar meta' : 'Nova meta', `<form id="formMeta"><div class="form-grid">
    <div class="field full"><label for="mt_titulo">Título *</label><input class="input" id="mt_titulo" required value="${escapeHTML(item?.titulo||'')}" placeholder="Ex.: Estudar para o concurso"></div>
    <div class="field"><label for="mt_categoria">Prazo</label><select class="input" id="mt_categoria">${['Curto prazo','Médio prazo','Longo prazo'].map(c=>`<option ${(item?.categoria||'Curto prazo')===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="mt_data">Data limite (opcional)</label><input class="input" type="date" id="mt_data" value="${item?.prazo||''}"></div>
    <div class="field"><label for="mt_progresso">Progresso manual (%)</label><input class="input" type="number" min="0" max="100" id="mt_progresso" value="${item?.progressoManual||0}" ${temEtapas?'disabled':''}></div>
    ${temEtapas ? '<p class="muted" style="grid-column:1/-1;font-size:11.5px;margin:-6px 0 0">Esta meta tem etapas — o progresso é calculado automaticamente por elas.</p>' : ''}
    <div class="field full"><label for="mt_descricao">Descrição</label><textarea id="mt_descricao">${escapeHTML(item?.descricao||'')}</textarea></div>
    <div class="field full"><label for="mt_observacoes">Observações</label><textarea id="mt_observacoes">${escapeHTML(item?.observacoes||'')}</textarea></div>
  </div><p class="field-error" id="mtaErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="mtaCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar meta'}</button></div></form>`);
  document.getElementById('mtaCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formMeta'), () => {
    const titulo = document.getElementById('mt_titulo').value.trim();
    if (!titulo){ const er=document.getElementById('mtaErro'); er.hidden=false; er.textContent='Informe o título da meta.'; return; }
    const progressoManual = temEtapas ? (item.progressoManual||0) : clamp(Number(document.getElementById('mt_progresso').value)||0, 0, 100);
    const dados = {titulo, categoria: document.getElementById('mt_categoria').value, prazo: document.getElementById('mt_data').value||null, descricao: document.getElementById('mt_descricao').value.trim(), observacoes: document.getElementById('mt_observacoes').value.trim(), progressoManual};
    if (item){
      DB.update('metas', item.id, dados);
      registrarHistorico({modulo:'metas', acao:'edição', descricao:`Meta "${dados.titulo}" editada.`, refId:item.id});
      showToast('✓ Meta atualizada.');
      if (!temEtapas) logProgressoMeta(item.id, progressoManual);
    } else {
      const nova = {id: DB.nextId('META','meta'), ...dados, etapas: [], status:'Em andamento', progressoHistorico: [], criadoEm: Date.now(), atualizadoEm: Date.now()};
      DB.insert('metas', nova);
      registrarHistorico({modulo:'metas', acao:'criação', descricao:`Meta "${nova.titulo}" criada.`, refId:nova.id});
      showToast('✓ Meta criada.');
      if (progressoManual>0) logProgressoMeta(nova.id, progressoManual);
    }
    closeModal(); renderCurrentView();
  });
}
function openFormEtapaMeta(metaId){
  const meta = DB.getById('metas', metaId); if (!meta) return;
  openModal('Nova etapa', `<form id="formEtapa"><div class="form-grid"><div class="field full"><label for="et_titulo">Etapa *</label><input class="input" id="et_titulo" required placeholder="Ex.: Matemática"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="etCancelar">Cancelar</button><button type="submit" class="btn btn-primary">Adicionar</button></div></form>`);
  document.getElementById('etCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formEtapa'), () => {
    const titulo = document.getElementById('et_titulo').value.trim(); if (!titulo) return;
    const etapas = [...(meta.etapas||[]), {id:uid('ET'), titulo, concluida:false}];
    DB.update('metas', metaId, {etapas});
    closeModal(); abrirDetalheMeta(metaId);
  });
}
function toggleEtapaMeta(metaId, etapaId){
  const meta = DB.getById('metas', metaId); if (!meta) return;
  const etapas = meta.etapas.map(e => e.id===etapaId ? {...e, concluida:!e.concluida} : e);
  const progresso = etapas.length ? Math.round((etapas.filter(e=>e.concluida).length/etapas.length)*100) : 0;
  DB.update('metas', metaId, {etapas, status: progresso===100 ? 'Concluída' : (meta.status==='Concluída'?'Em andamento':meta.status), dataConclusao: progresso===100 ? todayISO() : null});
  logProgressoMeta(metaId, progresso);
  if (progresso===100) registrarHistorico({modulo:'metas', acao:'conclusão', descricao:`Meta "${meta.titulo}" concluída.`, refId:metaId});
  abrirDetalheMeta(metaId);
}
function abrirDetalheMeta(id){
  const m = DB.getById('metas', id); if (!m) return;
  const progresso = progressoMeta(m);
  const tarefasRel = typeof tarefasDeMeta === 'function' ? tarefasDeMeta(id) : [];
  const sessoesRel = typeof sessoesDeMeta === 'function' ? sessoesDeMeta(id) : [];
  const minutosEstudo = typeof minutosEstudadosMeta === 'function' ? minutosEstudadosMeta(id) : 0;
  const historico = (m.progressoHistorico||[]).slice(-8);
  openModal(`🎯 ${escapeHTML(m.titulo)}`, `
    <div class="form-grid"><div class="detail-block"><div class="detail-label">Categoria</div><div class="detail-value">${escapeHTML(m.categoria)}</div></div>
    <div class="detail-block"><div class="detail-label">Prazo</div><div class="detail-value">${m.prazo?formatDateBR(m.prazo):'Sem prazo definido'}</div></div></div>
    <div class="detail-block"><div class="detail-label">Progresso</div><div style="background:var(--surface-2);border-radius:6px;overflow:hidden;height:16px;margin-top:4px"><div style="width:${progresso}%;background:${progresso===100?'var(--ok)':'var(--primary)'};height:100%"></div></div><div class="muted" style="font-size:12px;margin-top:3px">${progresso}%</div></div>
    ${m.descricao?`<div class="detail-block"><div class="detail-label">Descrição</div><div class="detail-value">${escapeHTML(m.descricao)}</div></div>`:''}
    <div class="detail-block"><div class="detail-label">Etapas</div><div class="activity-list">${(m.etapas||[]).map(e=>`
      <div data-etapa="${e.id}" style="display:flex;align-items:center;gap:8px;font-size:13.5px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:160px"><input type="checkbox" data-et="${e.id}" ${e.concluida?'checked':''}> <span style="${e.concluida?'text-decoration:line-through;color:var(--muted)':''}">${escapeHTML(e.titulo)}</span></label>
        ${!e.concluida?`<button type="button" class="btn btn-sm" data-act="etapa-tarefa" title="Criar tarefa a partir desta etapa">→ Tarefa</button><button type="button" class="btn btn-sm" data-act="etapa-estudo" title="Criar sessão de estudo a partir desta etapa">→ Estudo</button>`:''}
      </div>`).join('') || '<span class="muted">Nenhuma etapa cadastrada.</span>'}</div>
      <button class="btn btn-sm" id="metaNovaEtapa" style="margin-top:8px">＋ Nova etapa</button></div>
    <div class="stat-grid">
      ${[['Tarefas relacionadas',tarefasRel.length],['Sessões de estudo',sessoesRel.length],['Horas estudadas',(minutosEstudo/60).toFixed(1)+'h']].map(([l,n])=>`<div class="stat-card c-primary"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`).join('')}
    </div>
    ${tarefasRel.length ? `<div class="detail-block"><div class="detail-label">Tarefas relacionadas</div><div class="activity-list">${tarefasRel.map(t=>`<div class="history-row">${t.status==='Concluída'?'✅':'⬜'} ${escapeHTML(t.titulo)}</div>`).join('')}</div></div>` : ''}
    ${historico.length ? `<div class="detail-block"><div class="detail-label">Histórico de progresso</div><div class="activity-list">${historico.map(h=>`<div class="history-row"><span class="h-meta">${formatDateBR(h.data)}</span> — ${h.progresso}%</div>`).join('')}</div></div>` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" id="metaFechar">Fechar</button><button class="btn btn-danger" id="metaExcluir">Excluir</button><button class="btn btn-primary" id="metaEditar">Editar</button></div>`);
  document.getElementById('metaFechar').onclick = closeModal;
  document.getElementById('metaEditar').onclick = () => openFormMeta(id);
  document.getElementById('metaNovaEtapa').onclick = () => openFormEtapaMeta(id);
  document.getElementById('metaExcluir').onclick = () => confirmAction('Excluir esta meta?', () => { DB.remove('metas', id); showToast('Meta excluída.'); closeModal(); renderCurrentView(); });
  document.querySelectorAll('[data-et]').forEach(cb => cb.addEventListener('change', () => toggleEtapaMeta(id, cb.dataset.et)));
  document.querySelectorAll('[data-etapa]').forEach(row => {
    const etapa = (m.etapas||[]).find(e => e.id === row.dataset.etapa);
    row.querySelector('[data-act="etapa-tarefa"]')?.addEventListener('click', () => { closeModal(); openFormTarefa(null, null, {titulo: etapa.titulo, metaId: id}); });
    row.querySelector('[data-act="etapa-estudo"]')?.addEventListener('click', () => { closeModal(); openFormSessaoEstudo(null, null, 'Planejada', {assunto: etapa.titulo, metaId: id}); });
  });
}
function renderMetas(){
  const metas = DB.getAll('metas');
  const colunas = ['Curto prazo','Médio prazo','Longo prazo'];
  document.getElementById('listaMetas').innerHTML = colunas.map(cat => {
    const itens = metas.filter(m => m.categoria === cat);
    return `<div class="panel">
      <div class="panel-head"><h2>${cat}</h2></div>
      ${itens.length ? itens.map(m => { const p = progressoMeta(m); return `<div class="attn-item" data-meta="${m.id}">
        <div class="attn-dot" style="background:${m.status==='Concluída'?'var(--ok)':'var(--warn)'}"></div>
        <div class="attn-main"><div class="attn-title">${escapeHTML(m.titulo)}</div><div class="attn-sub">${p}% concluído${m.prazo?' · '+formatDateBR(m.prazo):''}</div></div>
      </div>`; }).join('') : '<p class="muted">Nenhuma meta cadastrada.</p>'}
    </div>`;
  }).join('');
  document.querySelectorAll('[data-meta]').forEach(el => el.addEventListener('click', () => abrirDetalheMeta(el.dataset.meta)));
}
document.querySelector('[data-action="nova-meta"]').addEventListener('click', () => openFormMeta());

/* ---------------------------------------------------------
   REFLEXÕES
   --------------------------------------------------------- */
const PERGUNTAS_REFLEXAO = [
  ['aconteceu','O que aconteceu hoje?'], ['aprendi','O que aprendi?'], ['fizBem','O que fiz bem?'],
  ['diferente','O que poderia ter feito diferente?'], ['preocupou','O que me preocupou?'],
  ['melhorarAmanha','O que quero melhorar amanhã?'], ['importante','Qual foi a coisa mais importante do meu dia?']
];
function openFormReflexao(id){
  const item = id ? DB.getById('reflexoes', id) : null;
  const resp = item?.respostas || {};
  openModal(item ? 'Editar reflexão' : 'Nova reflexão', `<form id="formReflexao"><div class="form-grid">
    <div class="field"><label for="rf_data">Data</label><input class="input" type="date" id="rf_data" value="${item?.data||todayISO()}"></div>
    <div class="field"><label for="rf_categoria">Categoria (opcional)</label><input class="input" id="rf_categoria" value="${escapeHTML(item?.categoria||'')}" placeholder="Ex.: pessoal, trabalho"></div>
    <div class="field full"><label for="rf_tags">Tags (separadas por vírgula)</label><input class="input" id="rf_tags" value="${escapeHTML((item?.tags||[]).join(', '))}" placeholder="#estudos, #objetivos"></div>
    <div class="field full"><label for="rf_livre">Escreva livremente (opcional)</label><textarea id="rf_livre" placeholder="Pode escrever à vontade, sem responder nenhuma pergunta abaixo.">${escapeHTML(item?.textoLivre||'')}</textarea></div>
    ${PERGUNTAS_REFLEXAO.map(([k,label]) => `<div class="field full"><label for="rf_${k}">${label} (opcional)</label><textarea id="rf_${k}">${escapeHTML(resp[k]||'')}</textarea></div>`).join('')}
  </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="rfCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Salvar reflexão'}</button></div></form>`);
  document.getElementById('rfCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formReflexao'), () => {
    const respostas = {}; PERGUNTAS_REFLEXAO.forEach(([k]) => { const v = document.getElementById(`rf_${k}`).value.trim(); if (v) respostas[k] = v; });
    const dados = {
      data: document.getElementById('rf_data').value || todayISO(),
      categoria: document.getElementById('rf_categoria').value.trim(),
      tags: document.getElementById('rf_tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      textoLivre: document.getElementById('rf_livre').value.trim(), respostas
    };
    if (item){ DB.update('reflexoes', item.id, dados); showToast('✓ Reflexão atualizada.'); }
    else {
      const nova = {id: DB.nextId('REFL','reflexao'), ...dados, criadoEm: Date.now()};
      DB.insert('reflexoes', nova);
      registrarHistorico({modulo:'reflexoes', acao:'criação', descricao:`Reflexão de ${formatDateBR(nova.data)} registrada.`, refId:nova.id});
      showToast('✓ Reflexão salva.');
    }
    closeModal(); renderCurrentView();
  });
}
function abrirDetalheReflexao(id){
  const r = DB.getById('reflexoes', id); if (!r) return;
  const perguntasRespondidas = PERGUNTAS_REFLEXAO.filter(([k]) => r.respostas?.[k]);
  openModal(`🧠 Reflexão · ${formatDateBR(r.data)}`, `
    ${r.categoria || r.tags?.length ? `<div class="activity-meta" style="margin-bottom:10px">${r.categoria?`<span>🏷️ ${escapeHTML(r.categoria)}</span>`:''}${(r.tags||[]).map(t=>`<span class="badge-pill badge-neutral">${escapeHTML(t)}</span>`).join(' ')}</div>` : ''}
    ${r.textoLivre?`<div class="detail-block"><div class="detail-label">Texto livre</div><div class="detail-value">${escapeHTML(r.textoLivre)}</div></div>`:''}
    ${perguntasRespondidas.map(([k,label]) => `<div class="detail-block"><div class="detail-label">${label}</div><div class="detail-value">${escapeHTML(r.respostas[k])}</div></div>`).join('')}
    ${(!r.textoLivre && !perguntasRespondidas.length) ? '<p class="muted">Sem conteúdo.</p>' : ''}
    <div class="modal-actions"><button class="btn btn-ghost" id="rfFechar">Fechar</button><button class="btn btn-danger" id="rfExcluir">Excluir</button><button class="btn btn-primary" id="rfEditar">Editar</button></div>`);
  document.getElementById('rfFechar').onclick = closeModal;
  document.getElementById('rfEditar').onclick = () => openFormReflexao(id);
  document.getElementById('rfExcluir').onclick = () => confirmAction('Excluir esta reflexão?', () => { DB.remove('reflexoes', id); showToast('Reflexão excluída.'); closeModal(); renderCurrentView(); });
}
function renderReflexoes(){
  const lista = DB.getAll('reflexoes').sort((a,b)=>b.data.localeCompare(a.data));
  const box = document.getElementById('listaReflexoes');
  const vazio = document.getElementById('vazioReflexoes');
  vazio.hidden = lista.length !== 0;
  if (!lista.length) vazio.innerHTML = 'Você ainda não escreveu nenhuma reflexão. Reserve um minuto para pensar sobre o seu dia. <button class="btn btn-sm btn-primary" id="vazioReflexoesBtn" style="margin-top:8px">＋ Nova reflexão</button>';
  if (!lista.length) document.getElementById('vazioReflexoesBtn').onclick = () => openFormReflexao();
  box.innerHTML = lista.map(r => {
    const resumo = r.textoLivre || Object.values(r.respostas||{})[0] || 'Sem conteúdo escrito.';
    return `<article class="activity-card" data-id="${r.id}">
      <div class="activity-main"><div class="activity-title">🧠 Reflexão de ${formatDateBR(r.data)}</div>
      <div class="activity-meta">${r.categoria?`<span>🏷️ ${escapeHTML(r.categoria)}</span>`:''}${(r.tags||[]).slice(0,3).map(t=>`<span class="badge-pill badge-neutral">${escapeHTML(t)}</span>`).join(' ')}</div>
      <div class="activity-description">${escapeHTML(resumo.slice(0,140))}${resumo.length>140?'…':''}</div></div>
      <div class="activity-actions"><button class="btn btn-sm btn-primary" data-act="ver">Acessar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
    </article>`;
  }).join('');
  box.querySelectorAll('.activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="ver"]').onclick = () => abrirDetalheReflexao(id);
    card.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Excluir esta reflexão?', () => { DB.remove('reflexoes', id); showToast('Excluída.'); renderReflexoes(); });
  });
}
document.querySelector('[data-action="nova-reflexao"]').addEventListener('click', () => openFormReflexao());
