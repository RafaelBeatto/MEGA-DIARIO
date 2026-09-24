/* ---------------------------------------------------------
   MEU DIA — painel de comando pessoal. Reúne o que já foi cadastrado
   em Agenda, Estudos, Tarefas, Rotinas, Metas e Diário (sem duplicar
   nada) e mostra o que precisa de atenção agora.
   --------------------------------------------------------- */
function renderMeuDiaQuickRow(){
  const opcoes = [
    {label:'Estudo', icon:'📚', acao:()=>openFormSessaoEstudo()},
    {label:'Tarefa', icon:'✅', acao:()=>openFormTarefa()},
    {label:'Diário', icon:'📝', acao:()=>openFormRegistroDiario()},
    {label:'Meta', icon:'🎯', acao:()=>openFormMeta()},
    {label:'Compromisso', icon:'📅', acao:()=>openFormEvento()},
    {label:'Reflexão', icon:'💭', acao:()=>openFormReflexao()},
    {label:'Rotina', icon:'🔄', acao:()=>openFormRotina()}
  ];
  const row = document.getElementById('quickRegisterRow');
  row.innerHTML = opcoes.map((o,i) => `<button type="button" class="quick-register-btn" data-qr="${i}"><span>${o.icon}</span>${o.label}</button>`).join('');
  row.querySelectorAll('[data-qr]').forEach((btn,i) => btn.addEventListener('click', opcoes[i].acao));
}

function saudacaoPorHora(){
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function mensagemContextualHoje(){
  const hoje = todayISO();
  const tarefasPendentes = DB.getAll('tarefas').filter(t => prazoTarefa(t).data === hoje && !['Concluída','Cancelada'].includes(t.status)).length;
  const compromissos = DB.getAll('eventos').filter(e => e.data === hoje && !e.concluido).length;
  const partes = [];
  if (tarefasPendentes) partes.push(`${tarefasPendentes} tarefa${tarefasPendentes===1?'':'s'}`);
  if (compromissos) partes.push(`${compromissos} compromisso${compromissos===1?'':'s'}`);
  if (!partes.length) return null;
  return `Você tem ${partes.join(' e ')} hoje.`;
}

function renderMeuDiaSaudacao(){
  const seq = calcularSequencia();
  const dataFmt = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}).replace(/^./,c=>c.toUpperCase());
  const contexto = mensagemContextualHoje();
  document.getElementById('meuDiaSaudacao').innerHTML = `
    <div class="greeting-row">
      <div><h1 class="greeting-title">${saudacaoPorHora()} 👋</h1><p class="muted greeting-date">${dataFmt}</p>${contexto?`<p class="muted greeting-context">${escapeHTML(contexto)}</p>`:''}</div>
      ${seq.atual > 0 ? `<div class="streak-badge" title="Sequência atual de dias ativos"><span class="streak-fire">🔥</span><div><strong>${seq.atual}</strong><span>dia${seq.atual===1?'':'s'}</span></div></div>` : ''}
    </div>`;
}

function proximoEventoHoje(){
  const hoje = todayISO();
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  const itens = itemsDoDia(hoje).filter(i => i.horarioInicio && i.horarioInicio >= horaAtual && !i.concluido);
  return itens.length ? itens[0] : null;
}
function formatarContagemRegressiva(horarioInicio){
  const agora = new Date();
  const [h,m] = horarioInicio.split(':').map(Number);
  const alvo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
  let diffMin = Math.max(0, Math.round((alvo - agora)/60000));
  const horas = Math.floor(diffMin/60), min = diffMin%60;
  if (horas > 0) return `Em ${horas}h ${min}min`;
  if (min > 0) return `Em ${min}min`;
  return 'Agora';
}
function renderMeuDiaProximoEvento(){
  const box = document.getElementById('meuDiaProximo');
  const prox = proximoEventoHoje();
  if (!prox){ box.innerHTML = ''; return; }
  box.innerHTML = `<div class="panel foco-panel proximo-panel" data-proximo="${prox.id}">
    <div class="detail-label">Próximo</div>
    <div class="proximo-row"><span class="proximo-hora">${escapeHTML(prox.horarioInicio)}</span><span class="proximo-titulo">${escapeHTML(prox.titulo)}</span></div>
    <div class="muted proximo-contagem">${formatarContagemRegressiva(prox.horarioInicio)}</div>
  </div>`;
  document.querySelector('[data-proximo]').addEventListener('click', () => abrirItemAgenda(prox));
}

function candidatoFocoDoDia(){
  const hoje = todayISO();
  const tarefasHoje = DB.getAll('tarefas').filter(t => prazoTarefa(t).data === hoje && !['Concluída','Cancelada'].includes(t.status));
  const ordemPrioridade = {Urgente:0, Alta:1, Média:2, Baixa:3};
  tarefasHoje.sort((a,b) => (ordemPrioridade[a.prioridade]??9) - (ordemPrioridade[b.prioridade]??9) || (a.horario||'99:99').localeCompare(b.horario||'99:99'));
  if (tarefasHoje.length) return {tipo:'tarefa', item:tarefasHoje[0]};
  const metas = DB.getAll('metas').filter(m => m.status !== 'Concluída' && m.prazo).sort((a,b) => a.prazo.localeCompare(b.prazo));
  if (metas.length) return {tipo:'meta', item:metas[0]};
  return null;
}
function renderMeuDiaFoco(){
  const box = document.getElementById('meuDiaFoco');
  const foco = candidatoFocoDoDia();
  if (!foco){ box.innerHTML = ''; return; }
  if (foco.tipo === 'tarefa'){
    const t = foco.item;
    box.innerHTML = `<div class="panel foco-panel" data-foco-tarefa="${t.id}">
      <div class="detail-label">Foco de hoje</div>
      <div class="foco-title">✅ ${escapeHTML(t.titulo)}</div>
      <div class="activity-meta">${badgeHTML(badgePrioridade(t.prioridade),t.prioridade)}${t.horario?`<span>⏰ ${escapeHTML(t.horario)}</span>`:''}</div>
    </div>`;
    document.querySelector('[data-foco-tarefa]').addEventListener('click', () => openFormTarefa(t.id));
  } else {
    const m = foco.item; const p = progressoMeta(m);
    box.innerHTML = `<div class="panel foco-panel" data-foco-meta="${m.id}">
      <div class="detail-label">Foco de hoje</div>
      <div class="foco-title">🎯 ${escapeHTML(m.titulo)}</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${p}%"></div></div>
      <div class="muted" style="font-size:12px;margin-top:4px">Progresso: ${p}%${m.prazo?` · prazo ${formatDateBR(m.prazo)}`:''}</div>
    </div>`;
    document.querySelector('[data-foco-meta]').addEventListener('click', () => abrirDetalheMeta(m.id));
  }
}

function renderMeuDiaAtencao(){
  const box = document.getElementById('meuDiaAtencao');
  const notifs = gerarNotificacoes();
  if (!notifs.length){ box.innerHTML = ''; return; }
  box.innerHTML = `<div class="panel">
    <div class="panel-head"><h2>⚠️ Atenção</h2></div>
    <div class="attention-list">${notifs.map((n,i) => `<div class="attn-item" data-notif="${i}"><div class="attn-dot ${n.tipo==='urgente'?'danger':n.tipo==='atencao'?'warn':''}"></div>
      <div class="attn-main"><div class="attn-title">${n.icone} ${escapeHTML(n.texto)}</div></div></div>`).join('')}</div>
  </div>`;
  box.querySelectorAll('[data-notif]').forEach(el => el.addEventListener('click', () => notifs[Number(el.dataset.notif)].go?.()));
}

/* junta tudo que tem hora ou data de hoje — agenda (eventos, estudos,
   tarefas, rotinas, prazos de meta) + registros do diário — numa
   única lista cronológica. Não duplica nada: cada linha só guarda a
   origem (_origem/_id) e delega a ação para as funções que cada
   módulo já expõe. */
function montarLinhaDoDia(hoje){
  const itens = itemsDoDia(hoje);
  const registros = DB.getAll('registros').filter(r => r.data === hoje).map(r => ({
    _origem:'registro', _id:r.id, id:`LINHA-${r.id}`, titulo:r.titulo, tipo:r.tipo,
    horarioInicio:r.hora||'', concluido:false, texto:r.texto
  }));
  return [...itens, ...registros].sort((a,b) => (a.horarioInicio||'99:99').localeCompare(b.horarioInicio||'99:99'));
}
function iconeLinhaDoDia(item){
  if (item._origem === 'evento') return '🗓️';
  if (item._origem === 'sessao') return '📚';
  if (item._origem === 'tarefa') return '✅';
  if (item._origem === 'rotina') return '🔄';
  if (item._origem === 'meta') return '🎯';
  if (item._origem === 'registro') return tipoRegistroIcon(item.tipo);
  return '📌';
}
function acoesLinhaDoDia(item, hoje){
  if (item._origem === 'sessao'){
    const s = DB.getById('sessoes', item._id); if (!s) return '';
    const concluir = s.status === 'Planejada' ? `<button type="button" class="btn btn-sm btn-primary" data-linha-concluir="sessao:${item._id}" title="Concluir">✓</button>` : '';
    const aprendizado = s.oQueAprendi ? `<button type="button" class="btn btn-sm" data-linha-aprendizado="${item._id}" title="Registrar aprendizado no Diário">📖</button>` : '';
    return concluir + aprendizado;
  }
  if (item._origem === 'tarefa'){
    const t = DB.getById('tarefas', item._id); if (!t) return '';
    return t.status !== 'Concluída' ? `<button type="button" class="btn btn-sm btn-primary" data-linha-concluir="tarefa:${item._id}" title="Concluir">✓</button>` : '';
  }
  if (item._origem === 'rotina'){
    const feita = rotinaConcluidaEm(item._id, hoje);
    return `<button type="button" class="btn btn-sm ${feita?'':'btn-primary'}" data-linha-rotina="${item._id}" title="${feita?'Desfazer':'Marcar como feita'}">${feita?'↩':'✓'}</button>`;
  }
  return '';
}
function renderMeuDiaLinha(hoje){
  const box = document.getElementById('meuDiaLinha');
  const linha = montarLinhaDoDia(hoje);
  box.innerHTML = linha.length ? linha.map(item => `
    <div class="linha-dia-item ${item.concluido?'is-done':''}" data-linha-item="${item._origem}:${item._id}">
      <span class="linha-dia-hora">${item.horarioInicio||'—'}</span>
      <span class="linha-dia-icone">${iconeLinhaDoDia(item)}</span>
      <span class="linha-dia-texto"><strong>${escapeHTML(item.titulo)}</strong>${item._origem==='registro' && item.texto ? `<br><span class="muted">${escapeHTML(item.texto.slice(0,90))}</span>` : ''}</span>
      <span class="linha-dia-acao">${acoesLinhaDoDia(item, hoje)}</span>
    </div>`).join('') : '<p class="muted">Nada por aqui ainda hoje.</p>';
  box.querySelectorAll('[data-linha-item]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-linha-concluir],[data-linha-rotina],[data-linha-aprendizado]')) return;
    const [origem, id] = el.dataset.linhaItem.split(':');
    abrirItemAgenda({_origem:origem, _id:id});
  }));
  box.querySelectorAll('[data-linha-concluir]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const [tipo, id] = btn.dataset.linhaConcluir.split(':');
    if (tipo === 'tarefa') concluirTarefa(id); else concluirSessaoEstudo(id);
  }));
  box.querySelectorAll('[data-linha-rotina]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRotinaConcluida(btn.dataset.linhaRotina, hoje);
    renderCurrentView();
  }));
  box.querySelectorAll('[data-linha-aprendizado]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    criarRegistroDeAprendizado(btn.dataset.linhaAprendizado);
  }));
  return linha;
}

function renderMeuDiaMetasDestaque(){
  const box = document.getElementById('meuDiaMetas');
  const metasAtivas = DB.getAll('metas').filter(m => m.status !== 'Concluída').sort((a,b) => (a.prazo||'9999').localeCompare(b.prazo||'9999')).slice(0,6);
  box.innerHTML = metasAtivas.length ? metasAtivas.map(m => { const p = progressoMeta(m); return `
    <div class="meta-chip" data-id="${m.id}">
      <div class="meta-chip-title">🎯 ${escapeHTML(m.titulo)}</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${p}%"></div></div>
      <div class="meta-chip-sub">${p}%${m.prazo?' · '+formatDateBR(m.prazo):''}</div>
    </div>`; }).join('') : '<p class="muted">Você ainda não tem metas em andamento. Que tal criar a primeira?</p>';
  box.querySelectorAll('.meta-chip').forEach(el => el.addEventListener('click', () => abrirDetalheMeta(el.dataset.id)));
  return metasAtivas;
}

function renderMeuDia(){
  const hoje = todayISO();
  renderMeuDiaSaudacao();
  renderMeuDiaProximoEvento();
  renderMeuDiaFoco();
  renderMeuDiaQuickRow();
  renderMeuDiaAtencao();

  const linha = renderMeuDiaLinha(hoje);
  const metasAtivas = renderMeuDiaMetasDestaque();

  const estudosHoje = DB.getAll('sessoes').filter(s => s.data === hoje);
  const tarefasHoje = DB.getAll('tarefas').filter(t => prazoTarefa(t).data === hoje);
  const rotinasHoje = rotinasAtivasHoje();
  const registrosHoje = DB.getAll('registros').filter(r => r.data === hoje);
  const compromissosHoje = itemsDoDia(hoje).length;

  const tarefasConcluidas = tarefasHoje.filter(t => t.status==='Concluída').length;
  const minutosHoje = estudosHoje.filter(s=>s.status==='Realizada').reduce((t,s)=>t+(s.duracaoMin||0),0);
  const rotinasFeitas = rotinasHoje.filter(r => rotinaConcluidaEm(r.id, hoje)).length;
  document.getElementById('meuDiaResumo').innerHTML = [
    ['📚', 'Estudos', `${(minutosHoje/60).toFixed(1)}h`, 'c-primary'],
    ['✅', 'Tarefas', `${tarefasConcluidas}/${tarefasHoje.length}`, 'c-ok'],
    ['🔄', 'Rotinas', `${rotinasFeitas}/${rotinasHoje.length}`, 'c-warn'],
    ['📝', 'Registros', registrosHoje.length, 'c-primary'],
    ['🗓️', 'Compromissos', compromissosHoje, 'c-primary']
  ].map(([icon,label,num,cls]) => `<div class="stat-card ${cls}"><div class="stat-num">${icon} ${num}</div><div class="stat-label">${label}</div></div>`).join('');

  const diaVazio = !linha.length && !metasAtivas.length;
  document.getElementById('meuDiaConteudoDoDia').hidden = diaVazio;
  const vazioBox = document.getElementById('meuDiaVazio');
  vazioBox.hidden = !diaVazio;
  if (diaVazio){
    vazioBox.innerHTML = `<div class="panel empty-day-panel">
      <p class="empty-day-title">Seu dia ainda está livre.</p>
      <p class="muted">Você pode:</p>
      <div class="empty-day-actions">
        <button type="button" class="btn" data-vazio-acao="registro">＋ Registrar um acontecimento</button>
        <button type="button" class="btn" data-vazio-acao="tarefa">＋ Criar uma tarefa</button>
        <button type="button" class="btn" data-vazio-acao="estudo">＋ Planejar um estudo</button>
        <button type="button" class="btn" data-vazio-acao="compromisso">＋ Adicionar um compromisso</button>
      </div>
    </div>`;
    vazioBox.querySelector('[data-vazio-acao="registro"]').onclick = () => openFormRegistroDiario();
    vazioBox.querySelector('[data-vazio-acao="tarefa"]').onclick = () => openFormTarefa();
    vazioBox.querySelector('[data-vazio-acao="estudo"]').onclick = () => openFormSessaoEstudo();
    vazioBox.querySelector('[data-vazio-acao="compromisso"]').onclick = () => openFormEvento();
  }
}
