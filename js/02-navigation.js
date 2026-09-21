/* ---------------------------------------------------------
   NAVEGAÇÃO / TEMA
   --------------------------------------------------------- */
const VIEW_META = {
  meudia: { title:'Meu Dia', sub:'O seu dia hoje, num só lugar' },
  semana: { title:'Semana', sub:'Planejamento semanal' },
  diario: { title:'Meu Diário', sub:'Acontecimentos, reflexões, ideias e aprendizados' },
  estudos: { title:'Meus Estudos', sub:'Matérias, sessões de estudo e revisões' },
  agenda: { title:'Agenda', sub:'Estudos, tarefas, rotinas e compromissos, tudo junto' },
  tarefas: { title:'Tarefas', sub:'O que precisa ser feito' },
  rotinas: { title:'Rotinas', sub:'Atividades recorrentes' },
  metas: { title:'Minhas Metas', sub:'Curto, médio e longo prazo' },
  reflexoes: { title:'Reflexões', sub:'Perguntas guia ou texto livre sobre o seu dia' },
  evolucao: { title:'Evolução', sub:'Retrospectivas, linha do tempo e histórico' },
  memoria: { title:'Memória', sub:'Pesquise em tudo o que você já registrou' },
  config: { title:'Configurações', sub:'Tema e backup dos seus dados' }
};

const HELP_TEXT = {
  meudia: 'Painel do dia: compromissos de hoje, estudos e tarefas planejadas, registro rápido e um resumo do que já foi feito.',
  semana: 'Planejamento semanal. Defina objetivos, distribua estudos e tarefas pelos dias e, aos domingos, faça a revisão da semana que terminou e o planejamento da próxima.',
  diario: 'Seu diário pessoal: registre acontecimentos, reflexões, ideias, aprendizados, conquistas, problemas ou observações, com data, tipo, categoria, humor e tags.',
  estudos: 'Organize suas matérias e assuntos, registre sessões de estudo (o que aprendeu, dificuldades, exercícios) e acompanhe revisões pendentes.',
  agenda: 'Reúne automaticamente estudos, tarefas, rotinas e compromissos com data e horário, em visão de dia, semana ou mês.',
  tarefas: 'Suas tarefas, com prioridade, prazo, categoria e recorrência.',
  rotinas: 'Cadastre atividades recorrentes (estudar, treinar, ler...) e elas aparecem automaticamente na Agenda e no Meu Dia, sem duplicar registros.',
  metas: 'Metas de curto, médio e longo prazo, com etapas e progresso calculado automaticamente.',
  reflexoes: 'Espaço livre para refletir sobre o seu dia, com perguntas guia opcionais — você não precisa responder todas.',
  evolucao: 'Retrospectivas por semana, mês e ano (apenas com os dados que você registrou), linha do tempo geral e histórico navegável por dia.',
  memoria: 'Pesquise em todo o seu histórico: diário, estudos, tarefas, metas, reflexões e agenda, tudo em um só lugar.',
  config: 'Alterne o tema e exporte ou restaure um backup completo dos seus dados.'
};

function mostrarAjuda(view){
  const meta = VIEW_META[view]; const texto = HELP_TEXT[view];
  if (!meta || !texto) return;
  openModal('Como funciona: ' + meta.title, `<div class="help-content"><p>${escapeHTML(texto)}</p></div>`);
}

let currentView = 'meudia';

function goToView(view, opts){
  if (!VIEW_META[view]) { console.warn('View inválida:', view); view = 'meudia'; }
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.hidden = (v.dataset.view !== view));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  document.getElementById('pageTitle').textContent = VIEW_META[view].title;
  document.getElementById('pageSubtitle').textContent = VIEW_META[view].sub;
  closeSidebarMobile();
  renderCurrentView(opts);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => goToView(btn.dataset.view)));
document.querySelectorAll('.nav-help').forEach(btn => {
  const show = (e) => { e.preventDefault(); e.stopPropagation(); mostrarAjuda(btn.dataset.help); };
  btn.addEventListener('click', show);
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') show(e); });
});

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('btnTheme').textContent = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('btnThemeMobile').textContent = theme === 'dark' ? '☀️' : '🌙';
}
function toggleTheme(){
  const cfg = DB.getConfig();
  cfg.theme = cfg.theme === 'dark' ? 'light' : 'dark';
  DB.saveConfig(cfg);
  applyTheme(cfg.theme);
}
document.getElementById('btnTheme').addEventListener('click', toggleTheme);
document.getElementById('btnThemeMobile').addEventListener('click', toggleTheme);

function updateClock(){
  const d = new Date();
  document.getElementById('clockTime').textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  document.getElementById('clockDate').textContent = formatDateBR(todayISO());
}
setInterval(updateClock, 1000 * 20);

/* sidebar mobile */
const sidebarEl = document.getElementById('sidebar');
const scrimEl = document.getElementById('scrim');
function openSidebarMobile(){ sidebarEl.classList.add('is-open'); scrimEl.classList.add('is-open'); document.getElementById('btnMenu').setAttribute('aria-expanded','true'); }
function closeSidebarMobile(){ sidebarEl.classList.remove('is-open'); scrimEl.classList.remove('is-open'); document.getElementById('btnMenu').setAttribute('aria-expanded','false'); }
document.getElementById('btnMenu').addEventListener('click', () => { sidebarEl.classList.contains('is-open') ? closeSidebarMobile() : openSidebarMobile(); });
scrimEl.addEventListener('click', closeSidebarMobile);

/* botão genérico "+ Registrar" no topo — direciona conforme a view atual */
document.getElementById('btnNewGeneric').addEventListener('click', () => {
  const map = {
    meudia: abrirRegistroRapido, semana: () => openFormObjetivoSemana(), diario: () => openFormRegistroDiario(),
    estudos: () => openFormSessaoEstudo(), agenda: () => openFormEvento(), tarefas: () => openFormTarefa(),
    rotinas: () => openFormRotina(), metas: () => openFormMeta(), reflexoes: () => openFormReflexao(),
    evolucao: abrirRegistroRapido, memoria: abrirRegistroRapido, config: abrirRegistroRapido
  };
  (map[currentView] || abrirRegistroRapido)();
});

function renderCurrentView(opts){
  switch(currentView){
    case 'meudia': renderMeuDia(); break;
    case 'semana': renderSemana(); break;
    case 'diario': renderDiario(); break;
    case 'estudos': renderEstudos(); break;
    case 'agenda': renderAgenda(); break;
    case 'tarefas': renderTarefas(); break;
    case 'rotinas': renderRotinas(); break;
    case 'metas': renderMetas(); break;
    case 'reflexoes': renderReflexoes(); break;
    case 'evolucao': renderEvolucao(); break;
    case 'memoria': renderMemoria(); break;
    case 'config': renderConfig(); break;
  }
}
