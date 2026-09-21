/* ---------------------------------------------------------
   MEUS ESTUDOS (matérias, sessões, revisões)
   --------------------------------------------------------- */
const REVISAO_INTERVALOS = [2, 7, 16, 35]; // dias — estrutura simples, pronta para revisão espaçada mais inteligente no futuro
function proximaRevisao(estagio, baseIso){
  const dias = REVISAO_INTERVALOS[Math.min(estagio, REVISAO_INTERVALOS.length-1)];
  return addDaysISO(baseIso || todayISO(), dias);
}

function openFormMateria(id){
  const item = id ? DB.getById('materias', id) : null;
  openModal(item ? 'Editar matéria' : 'Nova matéria', `<form id="formMateria"><div class="form-grid">
    <div class="field full"><label for="mt_nome">Nome da matéria *</label><input class="input" id="mt_nome" required value="${escapeHTML(item?.nome||'')}" placeholder="Ex.: Matemática"></div>
  </div><p class="field-error" id="mtErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="mtCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar':'Criar matéria'}</button></div></form>`);
  document.getElementById('mtCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formMateria'), () => {
    const nome = document.getElementById('mt_nome').value.trim();
    if (!nome){ const er=document.getElementById('mtErro'); er.hidden=false; er.textContent='Informe o nome da matéria.'; return; }
    if (item){ DB.update('materias', item.id, {nome}); showToast('✓ Matéria atualizada.'); }
    else {
      const nova = {id: DB.nextId('MAT','materia'), nome, assuntos: [], criadoEm: Date.now()};
      DB.insert('materias', nova);
      registrarHistorico({modulo:'estudos', acao:'criação', descricao:`Matéria "${nova.nome}" criada.`, refId:nova.id});
      showToast('✓ Matéria criada.');
    }
    closeModal(); renderCurrentView();
  });
}
function openFormAssunto(materiaId, assuntoId){
  const materia = DB.getById('materias', materiaId); if (!materia) return;
  const assunto = assuntoId ? materia.assuntos.find(a=>a.id===assuntoId) : null;
  openModal(assunto ? 'Editar assunto' : 'Novo assunto', `<form id="formAssunto"><div class="form-grid">
    <div class="field full"><label for="as_nome">Assunto *</label><input class="input" id="as_nome" required value="${escapeHTML(assunto?.nome||'')}" placeholder="Ex.: Frações"></div>
    <div class="field"><label for="as_progresso">Progresso (%)</label><input class="input" type="number" min="0" max="100" id="as_progresso" value="${assunto?.progresso||0}"></div>
  </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="asCancelar">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div></form>`);
  document.getElementById('asCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formAssunto'), () => {
    const nome = document.getElementById('as_nome').value.trim(); if (!nome) return;
    const progresso = clamp(Number(document.getElementById('as_progresso').value)||0, 0, 100);
    const assuntos = [...materia.assuntos];
    if (assunto){ const idx = assuntos.findIndex(a=>a.id===assunto.id); assuntos[idx] = {...assuntos[idx], nome, progresso}; }
    else assuntos.push({id:uid('AS'), nome, progresso, ultimaRevisao:null, proximaRevisao:null, estagioRevisao:0});
    DB.update('materias', materiaId, {assuntos});
    showToast('✓ Assunto salvo.'); closeModal(); abrirDetalheMateria(materiaId);
  });
}
function marcarAssuntoRevisado(materiaId, assuntoId){
  const materia = DB.getById('materias', materiaId); if (!materia) return;
  const assuntos = materia.assuntos.map(a => {
    if (a.id !== assuntoId) return a;
    const estagio = (a.estagioRevisao||0) + 1;
    return {...a, ultimaRevisao: todayISO(), estagioRevisao: estagio, proximaRevisao: proximaRevisao(estagio)};
  });
  DB.update('materias', materiaId, {assuntos});
  registrarHistorico({modulo:'estudos', acao:'revisão', descricao:`Revisão registrada em "${materia.nome}".`, refId:materiaId});
  showToast('✓ Revisão registrada.'); abrirDetalheMateria(materiaId);
}
function abrirDetalheMateria(id){
  const m = DB.getById('materias', id); if (!m) return;
  const assuntos = m.assuntos || [];
  const sessoes = typeof sessoesDeMateria === 'function' ? sessoesDeMateria(id) : DB.getAll('sessoes').filter(s=>s.materiaId===id);
  const realizadas = sessoes.filter(s=>s.status==='Realizada');
  const minutos = realizadas.reduce((t,s)=>t+(s.duracaoMin||0),0);
  const tarefasRel = typeof tarefasDeMateria === 'function' ? tarefasDeMateria(id) : [];
  const metasRel = typeof metasRelacionadasMateria === 'function' ? metasRelacionadasMateria(id) : [];
  openModal(`📚 ${escapeHTML(m.nome)}`, `
    <div class="stat-grid" style="margin-bottom:16px">
      ${[['Horas estudadas',(minutos/60).toFixed(1)+'h'],['Sessões realizadas',realizadas.length],['Assuntos',assuntos.length]].map(([l,n])=>`<div class="stat-card c-primary"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`).join('')}
    </div>
    <div class="modal-actions" style="justify-content:flex-start;margin-top:0;margin-bottom:14px"><button class="btn btn-sm btn-primary" id="mtNovoAssunto">＋ Novo assunto</button></div>
    <div class="activity-list">${assuntos.length ? assuntos.map(a => { const rv = statusRevisao(a.proximaRevisao); return `
      <article class="activity-card" data-as="${a.id}">
        <div class="activity-main"><div class="activity-title">${escapeHTML(a.nome)}</div>
          <div class="activity-description">Progresso: ${a.progresso||0}% · ${rv.icone} ${rv.texto}</div>
        </div>
        <div class="activity-actions"><button class="btn btn-sm btn-primary" data-act="revisar">✓ Revisei hoje</button><button class="btn btn-sm" data-act="editar">Editar</button></div>
      </article>`; }).join('') : '<p class="muted">Nenhum assunto cadastrado ainda.</p>'}</div>
    ${tarefasRel.length ? `<div class="detail-block" style="margin-top:14px"><div class="detail-label">Tarefas relacionadas</div><div class="activity-list">${tarefasRel.map(t=>`<div class="history-row">${t.status==='Concluída'?'✅':'⬜'} ${escapeHTML(t.titulo)}</div>`).join('')}</div></div>` : ''}
    ${metasRel.length ? `<div class="detail-block"><div class="detail-label">Metas relacionadas</div><div class="activity-list">${metasRel.map(mt=>`<div class="history-row" data-meta-link="${mt.id}" style="cursor:pointer">🎯 ${escapeHTML(mt.titulo)}</div>`).join('')}</div></div>` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" id="mtFechar">Fechar</button></div>`);
  document.getElementById('mtFechar').onclick = closeModal;
  document.getElementById('mtNovoAssunto').onclick = () => openFormAssunto(id);
  document.querySelectorAll('[data-as]').forEach(card => {
    const asId = card.dataset.as;
    card.querySelector('[data-act="revisar"]').onclick = () => marcarAssuntoRevisado(id, asId);
    card.querySelector('[data-act="editar"]').onclick = () => openFormAssunto(id, asId);
  });
  document.querySelectorAll('[data-meta-link]').forEach(el => el.addEventListener('click', () => abrirDetalheMeta(el.dataset.metaLink)));
}
function nomeMateria(materiaId){ const m = DB.getById('materias', materiaId); return m ? m.nome : '—'; }

function openFormSessaoEstudo(id, presetData, presetStatus){
  const item = id ? DB.getById('sessoes', id) : null;
  const materias = DB.getAll('materias');
  const metas = DB.getAll('metas');
  const statusInicial = item?.status || presetStatus || 'Realizada';
  openModal(item ? 'Editar sessão de estudo' : 'Sessão de estudo', `<form id="formSessao"><div class="form-grid">
    <div class="field"><label for="ss_materia">Matéria *</label><select class="input" id="ss_materia" required>${materias.length?'':'<option value="">Nenhuma matéria cadastrada</option>'}${materias.map(m=>`<option value="${m.id}" ${item?.materiaId===m.id?'selected':''}>${escapeHTML(m.nome)}</option>`).join('')}</select></div>
    <div class="field"><label for="ss_assunto">Assunto *</label><input class="input" id="ss_assunto" required value="${escapeHTML(item?.assunto||'')}" placeholder="Ex.: Frações"></div>
    <div class="field"><label for="ss_data">Data</label><input class="input" type="date" id="ss_data" value="${item?.data||presetData||todayISO()}"></div>
    <div class="field"><label for="ss_status">Status</label><select class="input" id="ss_status"><option value="Planejada" ${statusInicial==='Planejada'?'selected':''}>Planejada</option><option value="Realizada" ${statusInicial==='Realizada'?'selected':''}>Realizada</option></select></div>
    <div class="field"><label for="ss_inicio">Horário inicial</label><input class="input" type="time" id="ss_inicio" value="${item?.horarioInicio||''}"></div>
    <div class="field"><label for="ss_fim">Horário final</label><input class="input" type="time" id="ss_fim" value="${item?.horarioFim||''}"></div>
    <div class="field"><label for="ss_dificuldade">Dificuldade</label><select class="input" id="ss_dificuldade">${['Fácil','Média','Difícil'].map(d=>`<option ${(item?.dificuldade||'Média')===d?'selected':''}>${d}</option>`).join('')}</select></div>
    ${selectRelacaoHTML({id:'ss_meta', label:'Meta relacionada (opcional)', itens: metas.map(m=>({id:m.id,nome:m.titulo})), valorAtual:item?.metaId, vazio:'Nenhuma meta'})}
    <div class="field"><label for="ss_total">Exercícios (total)</label><input class="input" type="number" min="0" id="ss_total" value="${item?.exerciciosTotal||''}"></div>
    <div class="field"><label for="ss_acertos">Exercícios (acertos)</label><input class="input" type="number" min="0" id="ss_acertos" value="${item?.exerciciosAcertos||''}"></div>
    <div class="field full"><label for="ss_aprendi">O que você aprendeu?</label><textarea id="ss_aprendi">${escapeHTML(item?.oQueAprendi||'')}</textarea></div>
    <div class="field full"><label for="ss_obs">Observações / dificuldades</label><textarea id="ss_obs">${escapeHTML(item?.observacoes||'')}</textarea></div>
  </div><p class="field-error" id="ssErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="ssCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Salvar sessão'}</button></div></form>`);
  document.getElementById('ssCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formSessao'), () => {
    const materiaId = document.getElementById('ss_materia').value;
    const assunto = document.getElementById('ss_assunto').value.trim();
    if (!materiaId || !assunto){ const er=document.getElementById('ssErro'); er.hidden=false; er.textContent='Selecione a matéria e informe o assunto.'; return; }
    const ini = document.getElementById('ss_inicio').value, fim = document.getElementById('ss_fim').value;
    let duracaoMin = null;
    if (ini && fim){ const [h1,m1]=ini.split(':').map(Number), [h2,m2]=fim.split(':').map(Number); duracaoMin = Math.max(0,(h2*60+m2)-(h1*60+m1)); }
    const dados = {
      materiaId, assunto, data: document.getElementById('ss_data').value || todayISO(),
      status: document.getElementById('ss_status').value,
      horarioInicio: ini, horarioFim: fim, duracaoMin,
      dificuldade: document.getElementById('ss_dificuldade').value,
      metaId: document.getElementById('ss_meta').value || null,
      exerciciosTotal: Number(document.getElementById('ss_total').value)||0,
      exerciciosAcertos: Number(document.getElementById('ss_acertos').value)||0,
      oQueAprendi: document.getElementById('ss_aprendi').value.trim(),
      observacoes: document.getElementById('ss_obs').value.trim()
    };
    if (item){
      DB.update('sessoes', item.id, dados);
      registrarHistorico({modulo:'estudos', acao:'edição', descricao:`Sessão de ${dados.assunto} editada.`, refId:item.id});
      showToast('✓ Sessão atualizada.');
    } else {
      const nova = {id: DB.nextId('SES','sessao'), ...dados, criadoEm: Date.now(), atualizadoEm: Date.now()};
      DB.insert('sessoes', nova);
      registrarHistorico({modulo:'estudos', acao:'criação', descricao:`Sessão de ${nova.assunto} (${nova.status.toLowerCase()}) registrada.`, refId:nova.id});
      showToast(nova.status==='Planejada' ? '✓ Estudo planejado.' : '✓ Sessão de estudo registrada.');
    }
    if (dados.metaId && dados.status==='Realizada' && typeof registrarSnapshotProgressoMeta === 'function') registrarSnapshotProgressoMeta(dados.metaId);
    closeModal(); renderCurrentView();
  });
}
function concluirSessaoEstudo(id){
  const s = DB.getById('sessoes', id); if (!s) return;
  DB.update('sessoes', id, {status:'Realizada'});
  registrarHistorico({modulo:'estudos', acao:'conclusão', descricao:`Estudo de ${s.assunto} realizado.`, refId:id});
  if (s.metaId && typeof registrarSnapshotProgressoMeta === 'function') registrarSnapshotProgressoMeta(s.metaId);
  showToast('✓ Estudo concluído.'); renderCurrentView();
}
function statusRevisao(proximaRevisaoIso){
  if (!proximaRevisaoIso) return {icone:'⚪', texto:'Sem revisão agendada', tom:'neutral'};
  if (proximaRevisaoIso < todayISO()) return {icone:'🔴', texto:'Atrasada', tom:'danger'};
  if (proximaRevisaoIso === todayISO()) return {icone:'🟡', texto:'Hoje', tom:'warn'};
  return {icone:'🟢', texto:`Futura · ${formatDateBR(proximaRevisaoIso)}`, tom:'ok'};
}
function revisoesPendentes(){
  const hoje = todayISO(); const pendentes = [];
  DB.getAll('materias').forEach(m => (m.assuntos||[]).forEach(a => {
    if (a.proximaRevisao && a.proximaRevisao <= hoje) pendentes.push({materiaId:m.id, materiaNome:m.nome, assuntoId:a.id, assuntoNome:a.nome, data:a.proximaRevisao});
  }));
  return pendentes.sort((a,b)=>a.data.localeCompare(b.data));
}

function renderEstudos(){
  const materias = DB.getAll('materias');
  const sessoes = DB.getAll('sessoes').sort((a,b)=>`${b.data}${b.horarioInicio||''}`.localeCompare(`${a.data}${a.horarioInicio||''}`));
  const realizadas = sessoes.filter(s=>s.status==='Realizada');
  const minutosSemana = realizadas.filter(s=>mondayOf(s.data)===mondayOf(todayISO())).reduce((t,s)=>t+(s.duracaoMin||0),0);
  const revisoes = revisoesPendentes();

  document.getElementById('estudosStats').innerHTML = [
    ['Matérias', materias.length, 'c-primary'],
    ['Sessões realizadas', realizadas.length, 'c-ok'],
    ['Horas estudadas (semana)', (minutosSemana/60).toFixed(1)+'h', 'c-primary'],
    ['Revisões pendentes', revisoes.length, revisoes.length?'c-warn':'c-ok']
  ].map(([label,num,cls])=>`<div class="stat-card ${cls}"><div class="stat-num">${num}</div><div class="stat-label">${label}</div></div>`).join('');

  document.getElementById('listaMaterias').innerHTML = materias.length ? materias.map(m => {
    const total = (m.assuntos||[]).length;
    const media = total ? Math.round(m.assuntos.reduce((s,a)=>s+(a.progresso||0),0)/total) : 0;
    return `<div class="panel" data-mat="${m.id}" style="cursor:pointer;margin-bottom:0">
      <div class="panel-head"><h2>${escapeHTML(m.nome)}</h2></div>
      <div class="muted" style="font-size:12.5px">${total} assunto${total===1?'':'s'} · progresso médio ${media}%</div>
    </div>`;
  }).join('') : '<p class="muted">Nenhuma matéria cadastrada. Clique em "Nova matéria" para começar.</p>';
  document.querySelectorAll('[data-mat]').forEach(el => el.addEventListener('click', () => abrirDetalheMateria(el.dataset.mat)));

  document.getElementById('listaRevisoes').innerHTML = revisoes.length ? revisoes.map(r => `
    <div class="attn-item" data-mat="${r.materiaId}"><div class="attn-dot ${r.data<todayISO()?'danger':'warn'}"></div>
      <div class="attn-main"><div class="attn-title">${escapeHTML(r.materiaNome)} — ${escapeHTML(r.assuntoNome)}</div><div class="attn-sub">${r.data<todayISO()?'Atrasada · ':''}${formatDateBR(r.data)}</div></div>
    </div>`).join('') : '<p class="muted">Nenhuma revisão pendente.</p>';
  document.querySelectorAll('#listaRevisoes [data-mat]').forEach(el => el.addEventListener('click', () => abrirDetalheMateria(el.dataset.mat)));

  document.getElementById('listaSessoes').innerHTML = sessoes.slice(0,15).map(s => `<article class="activity-card" data-id="${s.id}">
    <div class="activity-main"><div class="activity-title-row"><span class="activity-icon">${s.status==='Planejada'?'🗓️':'📚'}</span><div><div class="activity-title">${escapeHTML(nomeMateria(s.materiaId))} — ${escapeHTML(s.assunto)}</div>
      <div class="activity-meta"><span class="badge-pill badge-${s.status==='Planejada'?'warn':'ok'}">${s.status}</span>${s.duracaoMin?`<span>⏱ ${s.duracaoMin} min</span>`:''}${s.exerciciosTotal?`<span>✍️ ${s.exerciciosAcertos||0}/${s.exerciciosTotal}</span>`:''}</div></div></div>
    </div>
    <div class="activity-side"><div class="muted" style="font-family:var(--font-mono);font-size:12px">${formatDateBR(s.data)}</div></div>
    <div class="activity-actions">${s.status==='Planejada'?'<button class="btn btn-sm btn-primary" data-act="concluir">✓ Concluir</button>':''}<button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
  </article>`).join('') || '<p class="muted">Nenhuma sessão registrada ainda.</p>';
  document.querySelectorAll('#listaSessoes .activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="concluir"]')?.addEventListener('click', () => concluirSessaoEstudo(id));
    card.querySelector('[data-act="editar"]').onclick = () => openFormSessaoEstudo(id);
    card.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Excluir esta sessão?', () => { DB.remove('sessoes', id); showToast('Sessão excluída.'); renderEstudos(); });
  });
}
document.querySelector('[data-action="nova-materia"]').addEventListener('click', () => openFormMateria());
document.querySelector('[data-action="nova-sessao"]').addEventListener('click', () => openFormSessaoEstudo());
