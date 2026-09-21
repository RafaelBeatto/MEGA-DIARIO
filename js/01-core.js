/* ---------------------------------------------------------
   MEGA DIÁRIO — NÚCLEO
   Vanilla JS, sem build, sem framework. Tudo global (sem módulos ES),
   igual ao padrão que este projeto usa em todos os arquivos js/0X-*.js.
   --------------------------------------------------------- */
const STORAGE_KEYS = {
  registros: 'md_registros',
  semanas: 'md_semanas',
  materias: 'md_materias',
  sessoes: 'md_sessoes',
  tarefas: 'md_tarefas',
  rotinas: 'md_rotinas',
  rotinaLog: 'md_rotina_log',
  motivos: 'md_motivos',
  eventos: 'md_eventos',
  metas: 'md_metas',
  reflexoes: 'md_reflexoes',
  historico: 'md_historico',
  config: 'md_config'
};

const DB = {
  _lastWriteFailed: null,
  _read(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('Erro ao ler localStorage', key, e);
      return null;
    }
  },
  _write(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      this._lastWriteFailed = { key, error:e, at:Date.now() };
      console.error('Erro ao gravar localStorage', key, e);
      return false;
    }
  },
  consumeWriteError(){
    const error = this._lastWriteFailed;
    this._lastWriteFailed = null;
    return error;
  },
  getAll(entity){
    return this._read(STORAGE_KEYS[entity]) || [];
  },
  saveAll(entity, list){
    return this._write(STORAGE_KEYS[entity], list);
  },
  getById(entity, id){
    return this.getAll(entity).find(item => item.id === id) || null;
  },
  insert(entity, item){
    const list = this.getAll(entity);
    list.push(item);
    const ok = this.saveAll(entity, list);
    return ok ? item : null;
  },
  update(entity, id, patch){
    const list = this.getAll(entity);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, atualizadoEm: Date.now() };
    const ok = this.saveAll(entity, list);
    return ok ? list[idx] : null;
  },
  remove(entity, id){
    const list = this.getAll(entity);
    const filtered = list.filter(i => i.id !== id);
    const ok = this.saveAll(entity, filtered);
    return ok && filtered.length !== list.length;
  },
  getConfig(){
    return this._read(STORAGE_KEYS.config) || { theme: 'dark', counters: {} };
  },
  saveConfig(cfg){
    this._write(STORAGE_KEYS.config, cfg);
  },
  nextId(prefix, counterKey){
    const cfg = this.getConfig();
    cfg.counters[counterKey] = (cfg.counters[counterKey] || 0) + 1;
    this.saveConfig(cfg);
    return `${prefix}-${String(cfg.counters[counterKey]).padStart(4, '0')}`;
  }
};

/* ---------------------------------------------------------
   UTILITÁRIOS DE DATA
   --------------------------------------------------------- */
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoFromDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseISODate(iso){
  if (!iso) return null;
  const [y,m,d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m-1, d);
}
function addDaysISO(iso, n){
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return isoFromDate(d);
}
function daysDiffFromToday(iso){
  const target = parseISODate(iso);
  if (!target) return null;
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayMid.getTime()) / 86400000);
}
function formatDateBR(iso){
  const d = parseISODate(iso);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function timestampToBR(ts){
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} — ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function getFiltrosValores(containerId){
  const container = document.getElementById(containerId);
  const valores = {};
  if (!container) return valores;
  container.querySelectorAll('[data-filter]').forEach(el => { valores[el.dataset.filter] = (el.value || '').trim(); });
  return valores;
}
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

/* id único para itens aninhados (etapas, assuntos, objetivos, etc.) —
   evita colisão quando dois itens são criados no mesmo milissegundo */
let _uidSeq = 0;
function uid(prefix){
  _uidSeq = (_uidSeq + 1) % 100000;
  return `${prefix}-${Date.now()}-${_uidSeq}`;
}

/* ---------------------------------------------------------
   PROTEÇÃO CONTRA ENVIO DUPLICADO
   Envolve o listener de submit de um form: enquanto o handler roda,
   ignora novos submits e desabilita o botão de confirmar.
   --------------------------------------------------------- */
function onSubmitGuarded(form, handler){
  let emAndamento = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (emAndamento) return;
    emAndamento = true;
    const btn = form.querySelector('button[type="submit"]');
    const textoOriginal = btn ? btn.textContent : null;
    if (btn){ btn.disabled = true; }
    try{
      await handler(e);
    } finally {
      emAndamento = false;
      if (btn && document.body.contains(btn)){ btn.disabled = false; if (textoOriginal !== null) btn.textContent = textoOriginal; }
    }
  });
}

/* ---------------------------------------------------------
   SELECT genérico para relacionar registros (meta, matéria...)
   --------------------------------------------------------- */
function selectRelacaoHTML({id, label, itens, valorAtual, vazio}){
  return `<div class="field"><label for="${id}">${escapeHTML(label)}</label>
    <select class="input" id="${id}"><option value="">${escapeHTML(vazio||'Nenhuma')}</option>
    ${itens.map(it => `<option value="${it.id}" ${valorAtual===it.id?'selected':''}>${escapeHTML(it.nome)}</option>`).join('')}
    </select></div>`;
}

/* semana: segunda a domingo */
function mondayOf(iso){
  const d = parseISODate(iso) || new Date();
  const diaSemana = (d.getDay() + 6) % 7; // segunda=0 ... domingo=6
  d.setDate(d.getDate() - diaSemana);
  return isoFromDate(d);
}
function diasDaSemana(mondayIso){
  const dias = [];
  for (let i=0;i<7;i++) dias.push(addDaysISO(mondayIso, i));
  return dias;
}
function nomeDiaCurto(iso){
  const d = parseISODate(iso);
  return d ? d.toLocaleDateString('pt-BR',{weekday:'long'}).replace(/^./,c=>c.toUpperCase()) : '';
}
function tituloSemana(mondayIso){
  const fim = addDaysISO(mondayIso, 6);
  const di = parseISODate(mondayIso), df = parseISODate(fim);
  const mesmoMes = di.getMonth() === df.getMonth();
  const fmt = (d,comMes) => `${String(d.getDate()).padStart(2,'0')}${comMes ? ' de '+d.toLocaleDateString('pt-BR',{month:'long'}) : ''}`;
  return `Semana de ${fmt(di,!mesmoMes)} a ${fmt(df,true)}`;
}

/* ---------------------------------------------------------
   HISTÓRICO
   --------------------------------------------------------- */
function registrarHistorico({ modulo, acao, descricao, refId }){
  const registro = { id: 'HIS-'+Date.now()+'-'+Math.floor(Math.random()*1000), timestamp: Date.now(), modulo, acao, descricao, refId: refId || null };
  const lista = DB.getAll('historico');
  lista.unshift(registro);
  if (lista.length > 1000) lista.length = 1000;
  DB.saveAll('historico', lista);
  return registro;
}

/* ---------------------------------------------------------
   UI — TOAST / CONFIRMAÇÃO / MODAL
   --------------------------------------------------------- */
function escapeHTML(str){
  if (str === null || str === undefined) return '';
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
function badgeHTML(tom, texto){
  return `<span class="badge-pill badge-${tom}">${escapeHTML(texto)}</span>`;
}

let toastTimer = null;
function showToast(msg){
  const storageError = DB?.consumeWriteError?.();
  if (storageError){
    msg = String(msg||'').startsWith('⚠') ? `${msg} Verifique o armazenamento do navegador.` : `⚠ Não foi possível salvar os dados. Verifique o armazenamento do navegador.`;
  }
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

function confirmAction(text, onConfirm){
  const backdrop = document.getElementById('confirmBackdrop');
  const btnOk = document.getElementById('btnConfirmOk');
  const btnCancel = document.getElementById('btnConfirmCancel');
  if (!backdrop || !btnOk || !btnCancel) return;
  document.getElementById('confirmText').textContent = text;
  backdrop.hidden = false;
  function cleanup(){ backdrop.hidden = true; btnOk.removeEventListener('click', onOk); btnCancel.removeEventListener('click', onCancel); backdrop.removeEventListener('click', onBackdropClick); }
  function onOk(){ cleanup(); onConfirm(); }
  function onCancel(){ cleanup(); }
  function onBackdropClick(e){ if (e.target === backdrop) onCancel(); }
  btnOk.addEventListener('click', onOk);
  btnCancel.addEventListener('click', onCancel);
  backdrop.addEventListener('click', onBackdropClick);
}

function openModal(title, bodyHTML){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalBackdrop').hidden = false;
}
function closeModal(){
  document.getElementById('modalBackdrop').hidden = true;
  document.getElementById('modalBody').innerHTML = '';
}
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('modalBackdrop');
  const confirm = document.getElementById('confirmBackdrop');
  if (confirm && !confirm.hidden) confirm.hidden = true;
  else if (modal && !modal.hidden) closeModal();
  else closeSidebarMobile();
});
document.getElementById('modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
