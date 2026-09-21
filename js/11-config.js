/* ---------------------------------------------------------
   CONFIGURAÇÕES — tema e backup/restauração completos
   Estrutura pronta para, no futuro, um assistente de IA consultar
   estes mesmos dados (DB.getAll) para responder perguntas.
   --------------------------------------------------------- */
function exportarBackupCompleto(){
  try{
    const dados = { app:'Mega Diário', formato:'backup-completo', versao:1, exportadoEm:new Date().toISOString(), dados:{} };
    Object.keys(STORAGE_KEYS).forEach(key => { dados.dados[key] = DB._read(STORAGE_KEYS[key]); });
    const blob = new Blob([JSON.stringify(dados, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `backup-mega-diario-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    const cfg = DB.getConfig(); cfg.ultimoBackup = Date.now(); DB.saveConfig(cfg);
    showToast('✓ Backup exportado.');
    renderConfig();
  }catch(e){
    console.error('Erro ao exportar backup', e);
    showToast('⚠ Não foi possível criar o backup.');
  }
}
function importarBackupCompleto(file){
  if (!file) return;
  confirmAction('Restaurar o backup substituirá todos os dados atuais do Mega Diário. Deseja continuar?', async () => {
    try{
      const texto = await file.text();
      const dados = JSON.parse(texto);
      if (dados?.formato !== 'backup-completo') throw new Error('Formato de backup não suportado');
      Object.entries(dados.dados||{}).forEach(([key, value]) => {
        if (STORAGE_KEYS[key]) DB._write(STORAGE_KEYS[key], value);
      });
      showToast('✓ Backup restaurado. A página será recarregada.');
      setTimeout(() => location.reload(), 700);
    }catch(e){
      console.error('Erro ao restaurar backup', e);
      showToast('⚠ Backup inválido ou não foi possível concluir a restauração.');
    }
  });
}
function limparTodosOsDados(){
  confirmAction('Isso apaga TODOS os dados do Mega Diário deste navegador. Tem certeza?', () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    showToast('Dados apagados. A página será recarregada.');
    setTimeout(() => location.reload(), 700);
  });
}

function renderConfig(){
  const cfg = DB.getConfig();
  document.getElementById('configConteudo').innerHTML = `
    <div class="panel">
      <div class="panel-head"><div><h2>Aparência</h2><p class="muted">O Mega Diário funciona 100% offline, sem depender de serviços externos.</p></div></div>
      <button class="btn btn-primary" id="cfgToggleTema">${cfg.theme==='dark' ? '☀️ Mudar para tema claro' : '🌙 Mudar para tema escuro'}</button>
    </div>
    <div class="panel backup-panel">
      <div class="panel-head"><div><h2>Backup e restauração</h2><p class="muted">Faça uma cópia de segurança de todos os seus dados (diário, semanas, estudos, tarefas, rotinas, agenda, metas e reflexões).</p></div></div>
      <div class="backup-actions">
        <button class="btn btn-primary" id="cfgBackup">💾 Exportar backup completo</button>
        <button class="btn btn-ghost" id="cfgRestaurar">📥 Restaurar backup</button>
        <input type="file" id="cfgInputRestaurar" accept=".json,application/json" hidden>
      </div>
      <p class="muted backup-warning">${cfg.ultimoBackup ? `Último backup: ${timestampToBR(cfg.ultimoBackup)}` : 'Você ainda não fez nenhum backup.'}</p>
      <p class="muted backup-warning">Guarde o arquivo exportado em um local seguro — ele contém todos os seus registros pessoais. Restaurar sempre substitui os dados atuais (não existe mesclagem automática, para evitar conflitos).</p>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>Zona de risco</h2></div></div>
      <button class="btn btn-danger" id="cfgLimpar">🗑️ Apagar todos os dados deste navegador</button>
    </div>`;
  document.getElementById('cfgToggleTema').onclick = () => { toggleTheme(); renderConfig(); };
  document.getElementById('cfgBackup').onclick = exportarBackupCompleto;
  document.getElementById('cfgRestaurar').onclick = () => document.getElementById('cfgInputRestaurar').click();
  document.getElementById('cfgInputRestaurar').addEventListener('change', () => {
    const file = document.getElementById('cfgInputRestaurar').files?.[0];
    importarBackupCompleto(file);
    document.getElementById('cfgInputRestaurar').value = '';
  });
  document.getElementById('cfgLimpar').onclick = limparTodosOsDados;
}
