/* ---------------------------------------------------------
   CENTRAL — sino de notificações, busca global (Ctrl+K),
   atalhos de teclado e navegação inferior mobile.
   --------------------------------------------------------- */

/* ---------------- notificações ---------------- */
let notifDropdownAberto = false;
function fecharNotifDropdown(){
  const el = document.getElementById('notifDropdown');
  if (el) el.remove();
  notifDropdownAberto = false;
  document.getElementById('btnNotificacoes')?.setAttribute('aria-expanded','false');
}
function abrirNotifDropdown(){
  fecharNotifDropdown();
  const notifs = gerarNotificacoes();
  const painel = document.createElement('div');
  painel.className = 'notif-dropdown';
  painel.id = 'notifDropdown';
  painel.innerHTML = notifs.length
    ? notifs.map((n,i) => `<button type="button" class="notif-item is-${n.tipo}" data-i="${i}"><span class="notif-dot"></span><span>${n.icone} ${escapeHTML(n.texto)}</span></button>`).join('')
    : '<div class="notif-empty">Tudo em dia por aqui. 🎉</div>';
  document.body.appendChild(painel);
  const btn = document.getElementById('btnNotificacoes');
  const rect = btn.getBoundingClientRect();
  painel.style.top = `${rect.bottom + 8}px`;
  painel.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
  painel.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { fecharNotifDropdown(); notifs[Number(el.dataset.i)].go?.(); }));
  notifDropdownAberto = true;
  btn.setAttribute('aria-expanded','true');
  setTimeout(() => document.addEventListener('click', onDocClickFechaNotif), 0);
}
function onDocClickFechaNotif(e){
  const painel = document.getElementById('notifDropdown');
  const btn = document.getElementById('btnNotificacoes');
  if (painel && !painel.contains(e.target) && e.target !== btn) { fecharNotifDropdown(); document.removeEventListener('click', onDocClickFechaNotif); }
}
function refreshNotifBadge(){
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const n = gerarNotificacoes().length;
  badge.hidden = n === 0;
  badge.textContent = n > 9 ? '9+' : String(n);
}
document.getElementById('btnNotificacoes').addEventListener('click', () => { notifDropdownAberto ? fecharNotifDropdown() : abrirNotifDropdown(); });

/* ---------------- busca global ---------------- */
/* o modal reaproveita blocosDeBusca/renderResultadosBusca (js/10-evolucao-memoria.js) —
   a mesma fonte de dados e navegação usada pela view Memória, só muda o
   container e o fato de fechar o modal antes de navegar */
function abrirBuscaGlobal(){
  openModal('🔍 Busca global', `<div class="field full"><input class="input input-wide" id="buscaGlobalInput" placeholder="Pesquisar em diário, estudos, tarefas, metas, reflexões, agenda, rotinas e revisões..." autocomplete="off"></div><div id="buscaGlobalResultados" style="margin-top:14px"></div>`);
  const input = document.getElementById('buscaGlobalInput');
  input.focus();
  function render(){ renderResultadosBusca(document.getElementById('buscaGlobalResultados'), input.value, {aoNavegar: closeModal, limite: 8}); }
  input.addEventListener('input', render);
  render();
}
document.getElementById('btnBusca').addEventListener('click', abrirBuscaGlobal);

/* ---------------- atalhos de teclado ---------------- */
document.addEventListener('keydown', (e) => {
  const alvo = e.target;
  const digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable);
  if (e.ctrlKey || e.metaKey){
    if (e.key.toLowerCase() === 'k'){ e.preventDefault(); abrirBuscaGlobal(); }
    return;
  }
  if (digitando || e.altKey) return;
  const modalAberto = !document.getElementById('modalBackdrop').hidden;
  if (modalAberto) return;
  switch(e.key.toLowerCase()){
    case 'n': abrirRegistroRapido(); break;
    case 't': openFormTarefa(); break;
    case 'e': openFormSessaoEstudo(); break;
    case 'm': openFormMeta(); break;
    case 'a': goToView('agenda'); break;
    case 'd': goToView('diario'); break;
    default: return;
  }
});

/* ---------------- navegação inferior (mobile) ---------------- */
const BOTTOM_NAV_ITENS = [
  {view:'meudia', icon:'🏠', label:'Início'},
  {view:'estudos', icon:'📚', label:'Estudos'},
  {view:null, icon:'➕', label:'Adicionar', acao:'add'},
  {view:'agenda', icon:'📅', label:'Agenda'},
  {view:'config', icon:'👤', label:'Mais'}
];
function montarBottomNav(){
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Navegação principal (mobile)');
  nav.innerHTML = BOTTOM_NAV_ITENS.map((it,i) => `<button type="button" class="bottom-nav-item" data-bn="${i}" aria-label="${escapeHTML(it.label)}"><span>${it.icon}</span><small>${escapeHTML(it.label)}</small></button>`).join('');
  document.body.appendChild(nav);
  nav.querySelectorAll('[data-bn]').forEach(btn => {
    const item = BOTTOM_NAV_ITENS[Number(btn.dataset.bn)];
    btn.addEventListener('click', () => { item.acao === 'add' ? abrirRegistroRapido() : goToView(item.view); });
  });
}
function atualizarBottomNavAtivo(){
  document.querySelectorAll('.bottom-nav-item').forEach((btn,i) => {
    const item = BOTTOM_NAV_ITENS[i];
    btn.classList.toggle('is-active', item.view === currentView);
  });
}
montarBottomNav();
