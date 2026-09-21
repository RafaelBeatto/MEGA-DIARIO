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

function renderMeuDia(){
  const hoje = todayISO();
  renderMeuDiaSaudacao();
  renderMeuDiaProximoEvento();
  renderMeuDiaFoco();
  renderMeuDiaQuickRow();
  renderMeuDiaAtencao();

  const itensHoje = itemsDoDia(hoje);
  const agendaBox = document.getElementById('meuDiaAgenda');
  agendaBox.innerHTML = `<div class="spotlight-panel">
    <div class="panel-head"><h2>🗓️ Hoje</h2><a href="#" class="link-btn" id="meuDiaVerAgenda">Ver agenda completa →</a></div>
    <div class="spotlight-section"><div class="spotlight-items">${itensHoje.length ? itensHoje.map(i => `
      <div class="spotlight-item" data-item="${i.id}"><div class="spotlight-icon">${i.horarioInicio?'⏰':'📌'}</div>
        <div class="spotlight-content"><div class="spotlight-item-title">${i.horarioInicio?i.horarioInicio+' — ':''}${escapeHTML(i.titulo)}</div><div class="spotlight-item-sub">${escapeHTML(i.tipo)}${i.concluido?' · concluído':''}</div></div>
      </div>`).join('') : '<p class="muted">Nada agendado para hoje.</p>'}</div></div>
  </div>`;
  document.getElementById('meuDiaVerAgenda').addEventListener('click', e => { e.preventDefault(); goToView('agenda'); });
  agendaBindChips(agendaBox, itensHoje);
  agendaBox.querySelectorAll('.spotlight-item').forEach(el => { const item = itensHoje.find(i=>i.id===el.dataset.item); if (item) el.addEventListener('click', () => abrirItemAgenda(item)); });

  const estudosHoje = DB.getAll('sessoes').filter(s => s.data === hoje);
  document.getElementById('meuDiaEstudos').innerHTML = estudosHoje.length ? estudosHoje.map(s => `
    <article class="activity-card" data-id="${s.id}"><div class="activity-main"><div class="activity-title">${escapeHTML(nomeMateria(s.materiaId))} — ${escapeHTML(s.assunto)}</div>
      <div class="activity-meta"><span class="badge-pill badge-${s.status==='Planejada'?'warn':'ok'}">${s.status}</span></div></div>
      <div class="activity-actions">${s.status==='Planejada'?'<button class="btn btn-sm btn-primary" data-act="concluir">✓ Concluir</button>':''}${s.oQueAprendi?`<button class="btn btn-sm" data-act="aprendizado">📖 ${s.aprendizadoRegistroId?'Ver no Diário':'Registrar no Diário'}</button>`:''}<button class="btn btn-sm" data-act="editar">Editar</button></div>
    </article>`).join('') : '<p class="muted">Nenhum estudo planejado para hoje.</p>';
  document.querySelectorAll('#meuDiaEstudos .activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="concluir"]')?.addEventListener('click', () => concluirSessaoEstudo(id));
    card.querySelector('[data-act="aprendizado"]')?.addEventListener('click', () => criarRegistroDeAprendizado(id));
    card.querySelector('[data-act="editar"]').onclick = () => openFormSessaoEstudo(id);
  });

  const tarefasHoje = DB.getAll('tarefas').filter(t => prazoTarefa(t).data === hoje);
  document.getElementById('meuDiaTarefas').innerHTML = tarefasHoje.length ? tarefasHoje.map(t => `
    <article class="activity-card ${tarefaAtrasada(t)?'is-late':''}" data-id="${t.id}"><div class="activity-main"><div class="activity-title">${escapeHTML(t.titulo)}</div>
      <div class="activity-meta">${badgeHTML(badgeStatusTarefa(t.status),t.status)} ${badgeHTML(badgePrioridade(t.prioridade),t.prioridade)}</div></div>
      <div class="activity-actions">${t.status!=='Concluída'?'<button class="btn btn-sm btn-primary" data-act="concluir">✓ Concluir</button>':''}<button class="btn btn-sm" data-act="editar">Editar</button></div>
    </article>`).join('') : '<p class="muted">Nenhuma tarefa para hoje.</p>';
  document.querySelectorAll('#meuDiaTarefas .activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="concluir"]')?.addEventListener('click', () => concluirTarefa(id));
    card.querySelector('[data-act="editar"]').onclick = () => openFormTarefa(id);
  });

  const rotinasHoje = rotinasAtivasHoje();
  document.getElementById('meuDiaRotinas').innerHTML = rotinasHoje.length ? rotinasHoje.map(r => { const feita = rotinaConcluidaEm(r.id, hoje); return `
    <article class="activity-card" data-id="${r.id}"><div class="activity-main"><div class="activity-title">🔄 ${escapeHTML(r.titulo)}</div>
      <div class="activity-meta">${badgeHTML(feita?'ok':'neutral', feita?'Feita hoje':'Pendente')}</div></div>
      <div class="activity-actions"><button class="btn btn-sm ${feita?'':'btn-primary'}" data-act="toggle">${feita?'↩ Desfazer':'✓ Feita hoje'}</button></div>
    </article>`; }).join('') : '<p class="muted">Nenhuma rotina prevista para hoje.</p>';
  document.querySelectorAll('#meuDiaRotinas .activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="toggle"]').onclick = () => { toggleRotinaConcluida(id, hoje); renderCurrentView(); };
  });

  const metasAtivas = DB.getAll('metas').filter(m => m.status !== 'Concluída').sort((a,b) => (a.prazo||'9999').localeCompare(b.prazo||'9999')).slice(0,4);
  document.getElementById('meuDiaMetas').innerHTML = metasAtivas.length ? metasAtivas.map(m => { const p = progressoMeta(m); return `
    <article class="activity-card" data-id="${m.id}"><div class="activity-main"><div class="activity-title">🎯 ${escapeHTML(m.titulo)}</div>
      <div class="progress-bar" style="margin-top:6px"><div class="progress-bar-fill" style="width:${p}%"></div></div>
      <div class="muted" style="font-size:11.5px;margin-top:3px">${p}%${m.prazo?' · '+formatDateBR(m.prazo):''}</div></div>
      <div class="activity-actions"><button class="btn btn-sm" data-act="ver">Abrir</button></div>
    </article>`; }).join('') : '<p class="muted">Você ainda não tem metas em andamento. Que tal criar a primeira?</p>';
  document.querySelectorAll('#meuDiaMetas .activity-card').forEach(card => card.querySelector('[data-act="ver"]').onclick = () => abrirDetalheMeta(card.dataset.id));

  const registrosHoje = DB.getAll('registros').filter(r => r.data === hoje);
  document.getElementById('meuDiaRegistros').innerHTML = registrosHoje.length ? registrosHoje.map(r => `
    <article class="activity-card" data-id="${r.id}"><div class="activity-main"><div class="activity-title">${tipoRegistroIcon(r.tipo)} ${escapeHTML(r.titulo)}</div>
      <div class="activity-description">${escapeHTML((r.texto||'').slice(0,90))}</div></div>
      <div class="activity-actions"><button class="btn btn-sm btn-primary" data-act="ver">Acessar</button></div>
    </article>`).join('') : '<p class="muted">Nenhum registro hoje. Use os botões acima para registrar algo.</p>';
  document.querySelectorAll('#meuDiaRegistros .activity-card').forEach(card => card.querySelector('[data-act="ver"]').onclick = () => abrirDetalheRegistroDiario(card.dataset.id));

  const tarefasConcluidas = tarefasHoje.filter(t => t.status==='Concluída').length;
  const minutosHoje = estudosHoje.filter(s=>s.status==='Realizada').reduce((t,s)=>t+(s.duracaoMin||0),0);
  const rotinasFeitas = rotinasHoje.filter(r => rotinaConcluidaEm(r.id, hoje)).length;
  document.getElementById('meuDiaResumo').innerHTML = [
    ['📚', 'Estudos', `${(minutosHoje/60).toFixed(1)}h`, 'c-primary'],
    ['✅', 'Tarefas', `${tarefasConcluidas}/${tarefasHoje.length}`, 'c-ok'],
    ['🔄', 'Rotinas', `${rotinasFeitas}/${rotinasHoje.length}`, 'c-warn'],
    ['📝', 'Registros', registrosHoje.length, 'c-primary'],
    ['🗓️', 'Compromissos', itensHoje.length, 'c-primary']
  ].map(([icon,label,num,cls]) => `<div class="stat-card ${cls}"><div class="stat-num">${icon} ${num}</div><div class="stat-label">${label}</div></div>`).join('');

  const diaVazio = !itensHoje.length && !estudosHoje.length && !tarefasHoje.length && !rotinasHoje.length && !registrosHoje.length && !metasAtivas.length;
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
