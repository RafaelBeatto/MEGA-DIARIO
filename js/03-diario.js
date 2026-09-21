/* ---------------------------------------------------------
   MEU DIÁRIO (registros pessoais) + REGISTRO RÁPIDO
   --------------------------------------------------------- */
const TIPOS_REGISTRO = ['Acontecimento','Reflexão','Ideia','Aprendizado','Conquista','Problema','Observação'];
function tipoRegistroIcon(tipo){
  return ({Acontecimento:'📌',Reflexão:'🧠',Ideia:'💡',Aprendizado:'📖',Conquista:'🏆',Problema:'⚠️',Observação:'👁️'})[tipo] || '📝';
}
function tipoRegistroTom(tipo){
  return ({Acontecimento:'primary',Reflexão:'primary',Ideia:'warn',Aprendizado:'ok',Conquista:'ok',Problema:'danger',Observação:'neutral'})[tipo] || 'neutral';
}
const HUMORES = [
  {v:'otimo', label:'😄 Ótimo'}, {v:'bom', label:'🙂 Bom'}, {v:'neutro', label:'😐 Neutro'},
  {v:'dificil', label:'😕 Difícil'}, {v:'ruim', label:'😞 Ruim'}
];
function humorLabel(v){ return (HUMORES.find(h=>h.v===v)||{}).label || ''; }

function abrirRegistroRapido(){
  const opcoes = [
    {tipo:'Acontecimento', icon:'📌', acao:()=>openFormRegistroDiario(null,'Acontecimento')},
    {tipo:'Estudo', icon:'📚', acao:()=>openFormSessaoEstudo()},
    {tipo:'Tarefa', icon:'✅', acao:()=>openFormTarefa()},
    {tipo:'Reflexão', icon:'🧠', acao:()=>openFormReflexao()},
    {tipo:'Ideia', icon:'💡', acao:()=>openFormRegistroDiario(null,'Ideia')},
    {tipo:'Aprendizado', icon:'📖', acao:()=>openFormRegistroDiario(null,'Aprendizado')}
  ];
  openModal('O que você quer registrar?', `<div class="quick-register-grid">${opcoes.map((o,i)=>`<button type="button" class="quick-register-btn" data-qr="${i}"><span>${o.icon}</span>${o.tipo}</button>`).join('')}</div>`);
  document.querySelectorAll('[data-qr]').forEach((btn,i) => btn.addEventListener('click', () => { closeModal(); opcoes[i].acao(); }));
}

function openFormRegistroDiario(id, tipoPreset){
  const item = id ? DB.getById('registros', id) : null;
  openModal(item ? 'Editar registro' : 'Novo registro', `<form id="formRegistroDiario" novalidate><div class="form-grid">
    <div class="field full"><label for="rd_titulo">Título *</label><input class="input" id="rd_titulo" required value="${escapeHTML(item?.titulo||'')}" placeholder="Ex.: Algo aconteceu no trabalho"></div>
    <div class="field"><label for="rd_tipo">Tipo</label><select class="input" id="rd_tipo">${TIPOS_REGISTRO.map(t=>`<option ${(item?.tipo||tipoPreset||'Acontecimento')===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="rd_categoria">Categoria</label><input class="input" id="rd_categoria" value="${escapeHTML(item?.categoria||'')}" placeholder="Ex.: trabalho, estudos, pessoal"></div>
    <div class="field"><label for="rd_data">Data</label><input class="input" type="date" id="rd_data" value="${item?.data||todayISO()}"></div>
    <div class="field"><label for="rd_hora">Horário</label><input class="input" type="time" id="rd_hora" value="${item?.hora||new Date().toTimeString().slice(0,5)}"></div>
    <div class="field"><label for="rd_humor">Humor (opcional)</label><select class="input" id="rd_humor"><option value="">Sem humor registrado</option>${HUMORES.map(h=>`<option value="${h.v}" ${item?.humor===h.v?'selected':''}>${h.label}</option>`).join('')}</select></div>
    <div class="field"><label for="rd_tags">Tags (separadas por vírgula)</label><input class="input" id="rd_tags" value="${escapeHTML((item?.tags||[]).join(', '))}"></div>
    <div class="field full"><label for="rd_texto">Descrição *</label><textarea id="rd_texto" required placeholder="Hoje aconteceu...">${escapeHTML(item?.texto||'')}</textarea></div>
  </div><p class="field-error" id="rdErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="rdCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Salvar registro'}</button></div></form>`);
  document.getElementById('rdCancelar').onclick = closeModal;
  document.getElementById('formRegistroDiario').addEventListener('submit', e => {
    e.preventDefault();
    const titulo = document.getElementById('rd_titulo').value.trim();
    const texto = document.getElementById('rd_texto').value.trim();
    if (!titulo || !texto){ const er=document.getElementById('rdErro'); er.hidden=false; er.textContent='Preencha título e descrição.'; return; }
    const dados = {
      titulo, texto, tipo: document.getElementById('rd_tipo').value,
      categoria: document.getElementById('rd_categoria').value.trim(),
      data: document.getElementById('rd_data').value || todayISO(),
      hora: document.getElementById('rd_hora').value,
      humor: document.getElementById('rd_humor').value || null,
      tags: document.getElementById('rd_tags').value.split(',').map(t=>t.trim()).filter(Boolean)
    };
    if (item){
      DB.update('registros', item.id, dados);
      registrarHistorico({modulo:'diario', acao:'edição', descricao:`Registro "${dados.titulo}" editado.`, refId:item.id});
      showToast('✓ Registro atualizado.');
    } else {
      const novo = {id: DB.nextId('REG','registro'), ...dados, criadoEm: Date.now(), atualizadoEm: Date.now()};
      DB.insert('registros', novo);
      registrarHistorico({modulo:'diario', acao:'criação', descricao:`Registro "${novo.titulo}" (${novo.tipo}) criado.`, refId:novo.id});
      showToast('✓ Registro salvo.');
    }
    closeModal(); renderCurrentView();
  });
}

function abrirDetalheRegistroDiario(id){
  const r = DB.getById('registros', id); if (!r) return;
  openModal(`${tipoRegistroIcon(r.tipo)} ${escapeHTML(r.titulo)}`, `
    <div class="activity-detail-head"><div><span class="badge-pill badge-${tipoRegistroTom(r.tipo)}">${escapeHTML(r.tipo)}</span></div>${r.humor?`<div>${humorLabel(r.humor)}</div>`:''}</div>
    <div class="form-grid">
      <div class="detail-block"><div class="detail-label">Data</div><div class="detail-value">${formatDateBR(r.data)} ${escapeHTML(r.hora||'')}</div></div>
      <div class="detail-block"><div class="detail-label">Categoria</div><div class="detail-value">${escapeHTML(r.categoria||'—')}</div></div>
    </div>
    <div class="detail-block"><div class="detail-label">Descrição</div><div class="detail-value">${escapeHTML(r.texto)}</div></div>
    ${r.tags?.length ? `<div class="detail-block"><div class="detail-label">Tags</div><div class="detail-value">${r.tags.map(t=>`<span class="badge-pill badge-neutral">${escapeHTML(t)}</span>`).join(' ')}</div></div>` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" id="rdFechar">Fechar</button><button class="btn btn-danger" id="rdExcluir">Excluir</button><button class="btn btn-primary" id="rdEditar">Editar</button></div>`);
  document.getElementById('rdFechar').onclick = closeModal;
  document.getElementById('rdEditar').onclick = () => openFormRegistroDiario(id);
  document.getElementById('rdExcluir').onclick = () => confirmAction('Tem certeza que deseja excluir este registro?', () => {
    DB.remove('registros', id);
    registrarHistorico({modulo:'diario', acao:'exclusão', descricao:`Registro "${r.titulo}" excluído.`, refId:id});
    showToast('Registro excluído.'); closeModal(); renderCurrentView();
  });
}

function renderDiario(){
  const filtros = getFiltrosValores('filtrosDiario');
  let lista = DB.getAll('registros');
  if (filtros.busca){ const q = filtros.busca.toLowerCase(); lista = lista.filter(r => [r.titulo,r.texto,r.categoria,...(r.tags||[])].join(' ').toLowerCase().includes(q)); }
  if (filtros.tipo) lista = lista.filter(r => r.tipo === filtros.tipo);
  if (filtros.data) lista = lista.filter(r => r.data === filtros.data);
  lista.sort((a,b) => `${b.data}T${b.hora||'00:00'}`.localeCompare(`${a.data}T${a.hora||'00:00'}`));

  const box = document.getElementById('listaDiario');
  document.getElementById('vazioDiario').hidden = lista.length !== 0;
  box.innerHTML = lista.map(r => `<article class="activity-card" data-id="${r.id}">
    <div class="activity-main">
      <div class="activity-title-row"><span class="activity-icon">${tipoRegistroIcon(r.tipo)}</span><div><div class="activity-title">${escapeHTML(r.titulo)}</div>
      <div class="activity-meta"><span class="badge-pill badge-${tipoRegistroTom(r.tipo)}">${escapeHTML(r.tipo)}</span>${r.categoria?`<span>🏷️ ${escapeHTML(r.categoria)}</span>`:''}${r.humor?`<span>${humorLabel(r.humor)}</span>`:''}</div></div></div>
      <div class="activity-description">${escapeHTML((r.texto||'').slice(0,140))}${(r.texto||'').length>140?'…':''}</div>
    </div>
    <div class="activity-side"><div class="muted" style="font-family:var(--font-mono);font-size:12px">${formatDateBR(r.data)}${r.hora?' · '+r.hora:''}</div></div>
    <div class="activity-actions"><button class="btn btn-sm btn-primary" data-act="ver">Acessar</button><button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></div>
  </article>`).join('');
  box.querySelectorAll('.activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="ver"]').onclick = () => abrirDetalheRegistroDiario(id);
    card.querySelector('[data-act="editar"]').onclick = () => openFormRegistroDiario(id);
    card.querySelector('[data-act="excluir"]').onclick = () => confirmAction('Excluir este registro?', () => {
      const it = DB.getById('registros', id); DB.remove('registros', id);
      registrarHistorico({modulo:'diario', acao:'exclusão', descricao:`Registro "${it.titulo}" excluído.`, refId:id});
      showToast('Registro excluído.'); renderDiario();
    });
  });
}
document.querySelectorAll('#filtrosDiario [data-filter]').forEach(el => el.addEventListener('input', renderDiario));
document.querySelector('[data-action="novo-registro-diario"]').addEventListener('click', () => openFormRegistroDiario());
