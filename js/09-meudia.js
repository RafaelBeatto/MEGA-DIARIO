/* ---------------------------------------------------------
   MEU DIA — painel do dia, só de leitura, reunindo o que já foi
   cadastrado em Agenda, Estudos, Tarefas e Diário (sem duplicar nada)
   --------------------------------------------------------- */
function renderMeuDiaQuickRow(){
  const opcoes = [
    {label:'Acontecimento', icon:'📌', acao:()=>openFormRegistroDiario(null,'Acontecimento')},
    {label:'Tarefa', icon:'✅', acao:()=>openFormTarefa()},
    {label:'Estudo', icon:'📚', acao:()=>openFormSessaoEstudo()},
    {label:'Reflexão', icon:'🧠', acao:()=>openFormReflexao()},
    {label:'Ideia', icon:'💡', acao:()=>openFormRegistroDiario(null,'Ideia')}
  ];
  const row = document.getElementById('quickRegisterRow');
  row.innerHTML = opcoes.map((o,i) => `<button type="button" class="quick-register-btn" data-qr="${i}"><span>${o.icon}</span>${o.label}</button>`).join('');
  row.querySelectorAll('[data-qr]').forEach((btn,i) => btn.addEventListener('click', opcoes[i].acao));
}

function renderMeuDia(){
  const hoje = todayISO();
  document.getElementById('meuDiaTitulo').textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}).replace(/^./,c=>c.toUpperCase());
  document.getElementById('meuDiaSubtitulo').textContent = 'Aqui está o resumo do seu dia.';
  renderMeuDiaQuickRow();

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
      <div class="activity-actions">${s.status==='Planejada'?'<button class="btn btn-sm btn-primary" data-act="concluir">✓ Concluir</button>':''}<button class="btn btn-sm" data-act="editar">Editar</button></div>
    </article>`).join('') : '<p class="muted">Nenhum estudo planejado para hoje.</p>';
  document.querySelectorAll('#meuDiaEstudos .activity-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="concluir"]')?.addEventListener('click', () => concluirSessaoEstudo(id));
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

  const registrosHoje = DB.getAll('registros').filter(r => r.data === hoje);
  document.getElementById('meuDiaRegistros').innerHTML = registrosHoje.length ? registrosHoje.map(r => `
    <article class="activity-card" data-id="${r.id}"><div class="activity-main"><div class="activity-title">${tipoRegistroIcon(r.tipo)} ${escapeHTML(r.titulo)}</div>
      <div class="activity-description">${escapeHTML((r.texto||'').slice(0,90))}</div></div>
      <div class="activity-actions"><button class="btn btn-sm btn-primary" data-act="ver">Acessar</button></div>
    </article>`).join('') : '<p class="muted">Nenhum registro hoje. Use os botões acima para registrar algo.</p>';
  document.querySelectorAll('#meuDiaRegistros .activity-card').forEach(card => card.querySelector('[data-act="ver"]').onclick = () => abrirDetalheRegistroDiario(card.dataset.id));

  const tarefasConcluidas = tarefasHoje.filter(t => t.status==='Concluída').length;
  const estudosConcluidos = estudosHoje.filter(s => s.status==='Realizada').length;
  document.getElementById('meuDiaResumo').innerHTML = [
    ['Tarefas concluídas', `${tarefasConcluidas}/${tarefasHoje.length}`, 'c-ok'],
    ['Estudos concluídos', `${estudosConcluidos}/${estudosHoje.length}`, 'c-primary'],
    ['Registros hoje', registrosHoje.length, 'c-primary'],
    ['Compromissos hoje', itensHoje.length, 'c-warn']
  ].map(([label,num,cls]) => `<div class="stat-card ${cls}"><div class="stat-num">${num}</div><div class="stat-label">${label}</div></div>`).join('');
}
