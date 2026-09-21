/* ---------------------------------------------------------
   INICIALIZAÇÃO
   --------------------------------------------------------- */
function init(){
  const cfg = DB.getConfig();
  applyTheme(cfg.theme || 'dark');
  updateClock();
  goToView('meudia');
}
init();
