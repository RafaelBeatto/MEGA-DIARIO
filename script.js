/* =========================================================
   MEGA DIÁRIO — carregador de módulos
   Vanilla JS, sem build, sem framework — cada js/0X-*.js é carregado
   em ordem e tudo fica no escopo global (sem módulos ES).
   ========================================================= */
(function(){
  const scripts=[
    '01-core.js',
    '02-navigation.js',
    '03-diario.js',
    '04-estudos.js',
    '05-tarefas-rotinas.js',
    '06-agenda.js',
    '07-semana.js',
    '08-metas-reflexoes.js',
    '09-meudia.js',
    '10-evolucao-memoria.js',
    '11-config.js',
    '12-inicializacao.js'
  ];
  const base='js/';
  function load(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=base+src; s.async=false;
      s.onload=resolve; s.onerror=()=>reject(new Error('Não foi possível carregar '+src));
      document.body.appendChild(s);
    });
  }
  (async()=>{
    try{ for(const src of scripts) await load(src); }
    catch(e){ console.error(e); const toast=document.getElementById('toast'); if(toast){toast.textContent='⚠ Erro ao carregar uma parte do sistema. Verifique os arquivos do projeto.';toast.hidden=false;} }
  })();
})();
