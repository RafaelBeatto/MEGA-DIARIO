/* ---------------------------------------------------------
   MEU DIÁRIO (registros pessoais) + REGISTRO RÁPIDO
   --------------------------------------------------------- */
const TIPOS_REGISTRO = ['Acontecimento','Reflexão','Ideia','Aprendizado','Conquista','Problema','Observação','Gratidão','Pensamento','Momento importante','Outro'];
function tipoRegistroIcon(tipo){
  return ({Acontecimento:'📌',Reflexão:'🧠',Ideia:'💡',Aprendizado:'📖',Conquista:'🏆',Problema:'⚠️',Observação:'👁️',Gratidão:'❤️',Pensamento:'💭','Momento importante':'⭐',Outro:'📝'})[tipo] || '📝';
}
function tipoRegistroTom(tipo){
  return ({Acontecimento:'primary',Reflexão:'primary',Ideia:'warn',Aprendizado:'ok',Conquista:'ok',Problema:'danger',Observação:'neutral',Gratidão:'ok',Pensamento:'primary','Momento importante':'warn',Outro:'neutral'})[tipo] || 'neutral';
}
const CATEGORIAS_REGISTRO = ['Pessoal','Trabalho','Estudos','Treino','Saúde','Financeiro','Projetos','Outro'];
const HUMORES = [
  {v:'otimo', label:'😄 Ótimo'}, {v:'bom', label:'🙂 Bom'}, {v:'neutro', label:'😐 Neutro'},
  {v:'dificil', label:'😕 Difícil'}, {v:'ruim', label:'😞 Ruim'}
];
function humorLabel(v){ return (HUMORES.find(h=>h.v===v)||{}).label || ''; }

function abrirRegistroRapido(){
  const opcoes = [
    {tipo:'Estudo', icon:'📚', acao:()=>openFormSessaoEstudo()},
    {tipo:'Tarefa', icon:'✅', acao:()=>openFormTarefa()},
    {tipo:'Diário', icon:'📝', acao:()=>openFormRegistroDiario()},
    {tipo:'Meta', icon:'🎯', acao:()=>openFormMeta()},
    {tipo:'Compromisso', icon:'📅', acao:()=>openFormEvento()},
    {tipo:'Reflexão', icon:'💭', acao:()=>openFormReflexao()},
    {tipo:'Rotina', icon:'🔄', acao:()=>openFormRotina()}
  ];
  openModal('O que você quer registrar?', `<div class="quick-register-grid">${opcoes.map((o,i)=>`<button type="button" class="quick-register-btn" data-qr="${i}"><span>${o.icon}</span>${o.tipo}</button>`).join('')}</div>`);
  document.querySelectorAll('[data-qr]').forEach((btn,i) => btn.addEventListener('click', () => { closeModal(); opcoes[i].acao(); }));
}

function openFormRegistroDiario(id, tipoPreset){
  const item = id ? DB.getById('registros', id) : null;
  const categoriaConhecida = item?.categoria && CATEGORIAS_REGISTRO.includes(item.categoria);
  const categoriaSelectInicial = item?.categoria ? (categoriaConhecida ? item.categoria : 'Outro') : '';
  const categoriaCustomInicial = item?.categoria && !categoriaConhecida ? item.categoria : '';
  openModal(item ? 'Editar registro' : 'Registrar acontecimento', `<form id="formRegistroDiario" novalidate><div class="form-grid">
    <div class="field full"><label for="rd_titulo">O que aconteceu? *</label><input class="input" id="rd_titulo" required value="${escapeHTML(item?.titulo||'')}" placeholder="Ex.: Hoje terminei o documento da APAE"></div>
    <div class="field"><label for="rd_tipo">Tipo</label><select class="input" id="rd_tipo">${TIPOS_REGISTRO.map(t=>`<option ${(item?.tipo||tipoPreset||'Acontecimento')===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="rd_categoria">Categoria</label><select class="input" id="rd_categoria"><option value="">Sem categoria</option>${CATEGORIAS_REGISTRO.map(c=>`<option ${categoriaSelectInicial===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field full" id="rd_categoria_outra_box" hidden><label for="rd_categoria_outra">Qual categoria?</label><input class="input" id="rd_categoria_outra" value="${escapeHTML(categoriaCustomInicial)}" placeholder="Descreva a categoria"></div>
    <div class="field"><label for="rd_data">Data</label><input class="input" type="date" id="rd_data" value="${item?.data||todayISO()}"></div>
    <div class="field"><label for="rd_hora">Horário</label><input class="input" type="time" id="rd_hora" value="${item?.hora||new Date().toTimeString().slice(0,5)}"></div>
    <div class="field"><label for="rd_humor">Humor (opcional)</label><select class="input" id="rd_humor"><option value="">Sem humor registrado</option>${HUMORES.map(h=>`<option value="${h.v}" ${item?.humor===h.v?'selected':''}>${h.label}</option>`).join('')}</select></div>
    <div class="field"><label for="rd_energia">Energia (1 a 5, opcional)</label><select class="input" id="rd_energia"><option value="">Não informar</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(item?.energia)===n?'selected':''}>${'⚡'.repeat(n)} (${n})</option>`).join('')}</select></div>
    <div class="field full"><label for="rd_tags">Tags (separadas por vírgula)</label><input class="input" id="rd_tags" value="${escapeHTML((item?.tags||[]).join(', '))}" placeholder="#estudos, #trabalho, #família"></div>
    <div class="field full"><label for="rd_texto">Observação (opcional)</label><textarea id="rd_texto" placeholder="Quer detalhar mais?">${escapeHTML(item?.texto||'')}</textarea></div>
  </div><p class="field-error" id="rdErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="rdCancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Salvar registro'}</button></div></form>`);
  const categoriaSel = document.getElementById('rd_categoria'), categoriaOutraBox = document.getElementById('rd_categoria_outra_box');
  function toggleCategoriaOutra(){ categoriaOutraBox.hidden = categoriaSel.value !== 'Outro'; }
  categoriaSel.addEventListener('change', toggleCategoriaOutra); toggleCategoriaOutra();
  document.getElementById('rdCancelar').onclick = closeModal;
  onSubmitGuarded(document.getElementById('formRegistroDiario'), () => {
    const titulo = document.getElementById('rd_titulo').value.trim();
    if (!titulo){ const er=document.getElementById('rdErro'); er.hidden=false; er.textContent='Diga o que aconteceu.'; return; }
    const categoria = categoriaSel.value === 'Outro' ? document.getElementById('rd_categoria_outra').value.trim() : categoriaSel.value;
    const dados = {
      titulo, texto: document.getElementById('rd_texto').value.trim(), tipo: document.getElementById('rd_tipo').value,
      categoria,
      data: document.getElementById('rd_data').value || todayISO(),
      hora: document.getElementById('rd_hora').value,
      humor: document.getElementById('rd_humor').value || null,
      energia: document.getElementById('rd_energia').value ? Number(document.getElementById('rd_energia').value) : null,
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
    <div class="activity-detail-head"><div><span class="badge-pill badge-${tipoRegistroTom(r.tipo)}">${escapeHTML(r.tipo)}</span></div><div>${r.humor?humorLabel(r.humor):''}${r.energia?` · ${'⚡'.repeat(r.energia)}`:''}</div></div>
    <div class="form-grid">
      <div class="detail-block"><div class="detail-label">Data</div><div class="detail-value">${formatDateBR(r.data)} ${escapeHTML(r.hora||'')}</div></div>
      <div class="detail-block"><div class="detail-label">Categoria</div><div class="detail-value">${escapeHTML(r.categoria||'—')}</div></div>
    </div>
    ${r.texto ? `<div class="detail-block"><div class="detail-label">Observação</div><div class="detail-value">${escapeHTML(r.texto)}</div></div>` : ''}
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

let diarioModo = 'lista';

function renderDiarioLista(lista){
  const box = document.getElementById('listaDiario');
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
function renderDiarioTimeline(lista){
  const box = document.getElementById('listaDiario');
  const porDia = {};
  lista.forEach(r => { (porDia[r.data] = porDia[r.data] || []).push(r); });
  const dias = Object.keys(porDia).sort((a,b) => b.localeCompare(a));
  box.innerHTML = dias.map(dia => {
    const itens = [...porDia[dia]].sort((a,b) => (a.hora||'00:00').localeCompare(b.hora||'00:00'));
    return `<div class="activity-day">${formatDateBR(dia)}</div>` + itens.map(r => `
      <div class="activity-row timeline-row" data-id="${r.id}">
        <span class="activity-time">${r.hora||'—'}</span>
        <span>${tipoRegistroIcon(r.tipo)} <strong>${escapeHTML(r.titulo)}</strong>${r.texto?` — ${escapeHTML(r.texto.slice(0,80))}${r.texto.length>80?'…':''}`:''}</span>
      </div>`).join('');
  }).join('');
  box.querySelectorAll('.timeline-row').forEach(row => row.addEventListener('click', () => abrirDetalheRegistroDiario(row.dataset.id)));
}
function renderDiario(){
  const filtros = getFiltrosValores('filtrosDiario');
  let lista = DB.getAll('registros');
  if (filtros.busca){ const q = filtros.busca.toLowerCase(); lista = lista.filter(r => [r.titulo,r.texto,r.categoria,...(r.tags||[])].join(' ').toLowerCase().includes(q)); }
  if (filtros.tipo) lista = lista.filter(r => r.tipo === filtros.tipo);
  if (filtros.categoria) lista = lista.filter(r => r.categoria === filtros.categoria);
  if (filtros.data) lista = lista.filter(r => r.data === filtros.data);
  lista.sort((a,b) => `${b.data}T${b.hora||'00:00'}`.localeCompare(`${a.data}T${a.hora||'00:00'}`));

  document.querySelectorAll('#diarioModoTabs [data-modo]').forEach(b => b.classList.toggle('is-active', b.dataset.modo===diarioModo));
  const vazio = document.getElementById('vazioDiario');
  const semFiltro = !filtros.busca && !filtros.tipo && !filtros.categoria && !filtros.data;
  vazio.hidden = lista.length !== 0;
  if (!lista.length){
    vazio.textContent = semFiltro ? 'Você ainda não tem registros no diário. Comece anotando o que aconteceu hoje, uma ideia ou um aprendizado.' : 'Nenhum registro encontrado com esses filtros.';
    document.getElementById('listaDiario').innerHTML = '';
    return;
  }
  if (diarioModo === 'timeline') renderDiarioTimeline(lista);
  else renderDiarioLista(lista);
}
document.querySelectorAll('#filtrosDiario [data-filter]').forEach(el => el.addEventListener('input', renderDiario));
document.querySelectorAll('#diarioModoTabs [data-modo]').forEach(b => b.addEventListener('click', () => { diarioModo = b.dataset.modo; renderDiario(); }));
document.querySelector('[data-action="novo-registro-diario"]').addEventListener('click', () => openFormRegistroDiario());

/* popula o filtro de tipo a partir de TIPOS_REGISTRO uma única vez —
   assim a lista de opções nunca fica desatualizada em relação ao JS */
(function popularFiltrosDiario(){
  const selTipo = document.querySelector('#filtrosDiario [data-filter="tipo"]');
  if (selTipo) selTipo.innerHTML = '<option value="">Tipo: todos</option>' + TIPOS_REGISTRO.map(t=>`<option>${t}</option>`).join('');
  const selCategoria = document.querySelector('#filtrosDiario [data-filter="categoria"]');
  if (selCategoria) selCategoria.innerHTML = '<option value="">Categoria: todas</option>' + CATEGORIAS_REGISTRO.map(c=>`<option>${c}</option>`).join('');
})();
