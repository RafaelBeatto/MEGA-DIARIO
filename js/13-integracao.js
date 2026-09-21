/* ---------------------------------------------------------
   INTEGRAÇÃO — o "sistema nervoso" do Mega Diário.
   Aqui vivem as relações entre módulos (por ID, sem duplicar dados),
   os cálculos agregados (estatísticas, sequência de dias ativos) e a
   geração de notificações. Nenhum módulo deve calcular essas coisas
   por conta própria — todos consultam estas funções.
   Esta camada também é o ponto de entrada que um futuro assistente
   de IA usaria para responder perguntas sobre os dados do usuário.
   --------------------------------------------------------- */

/* ---------------- relações por ID ---------------- */
function tarefasDeMeta(metaId){ return DB.getAll('tarefas').filter(t => t.metaId === metaId); }
function sessoesDeMeta(metaId){ return DB.getAll('sessoes').filter(s => s.metaId === metaId); }
function tarefasDeMateria(materiaId){ return DB.getAll('tarefas').filter(t => t.materiaId === materiaId); }
function sessoesDeMateria(materiaId){ return DB.getAll('sessoes').filter(s => s.materiaId === materiaId); }
function metasRelacionadasMateria(materiaId){
  const idsPorTarefa = tarefasDeMateria(materiaId).map(t => t.metaId).filter(Boolean);
  const idsPorSessao = sessoesDeMateria(materiaId).map(s => s.metaId).filter(Boolean);
  const ids = [...new Set([...idsPorTarefa, ...idsPorSessao])];
  return ids.map(id => DB.getById('metas', id)).filter(Boolean);
}
function minutosEstudadosMeta(metaId){
  return sessoesDeMeta(metaId).filter(s => s.status==='Realizada').reduce((t,s) => t + (s.duracaoMin||0), 0);
}

/* ---------------------------------------------------------
   ROTINAS — registro de conclusão por dia (não altera a rotina em si)
   --------------------------------------------------------- */
function rotinaLogId(rotinaId, iso){ return `${rotinaId}_${iso}`; }
function rotinaConcluidaEm(rotinaId, iso){ return !!DB.getById('rotinaLog', rotinaLogId(rotinaId, iso)); }
function toggleRotinaConcluida(rotinaId, iso){
  const id = rotinaLogId(rotinaId, iso);
  if (DB.getById('rotinaLog', id)){
    DB.remove('rotinaLog', id);
    return false;
  }
  DB.insert('rotinaLog', { id, rotinaId, data: iso, criadoEm: Date.now() });
  const rotina = DB.getById('rotinas', rotinaId);
  if (rotina) registrarHistorico({ modulo:'rotinas', acao:'conclusão', descricao:`Rotina "${rotina.titulo}" realizada em ${formatDateBR(iso)}.`, refId:rotinaId });
  return true;
}
function rotinasRealizadasNoPeriodo(inicioIso, fimIso){
  return DB.getAll('rotinaLog').filter(l => l.data >= inicioIso && l.data <= fimIso);
}
function rotinasAtivasHoje(){
  const hoje = todayISO();
  return DB.getAll('rotinas').filter(r => rotinaOcorreEm(r, hoje) && ((r.criadoEm ? isoFromDate(new Date(r.criadoEm)) : hoje) <= hoje));
}

/* ---------------------------------------------------------
   DIAS ATIVOS / SEQUÊNCIA — só conta atividade real, nunca "abrir o app"
   --------------------------------------------------------- */
function diasAtivosSet(){
  const dias = new Set();
  DB.getAll('sessoes').forEach(s => { if (s.status === 'Realizada' && s.data) dias.add(s.data); });
  DB.getAll('tarefas').forEach(t => { if (t.status === 'Concluída' && t.dataConclusao) dias.add(t.dataConclusao); });
  DB.getAll('rotinaLog').forEach(l => dias.add(l.data));
  DB.getAll('registros').forEach(r => { if (r.data) dias.add(r.data); });
  DB.getAll('reflexoes').forEach(r => { if (r.data) dias.add(r.data); });
  DB.getAll('metas').forEach(m => {
    (m.progressoHistorico||[]).forEach(h => { if (h.data) dias.add(h.data); });
    if (m.status === 'Concluída' && m.dataConclusao) dias.add(m.dataConclusao);
  });
  DB.getAll('historico').forEach(h => {
    if (h.modulo === 'tarefas' && h.acao === 'conclusão'){
      const iso = isoFromDate(new Date(h.timestamp));
      dias.add(iso);
    }
  });
  return dias;
}
function calcularSequencia(){
  const dias = diasAtivosSet();
  let cursor = todayISO();
  if (!dias.has(cursor)) cursor = addDaysISO(cursor, -1); // dá a margem do dia atual ainda não ter atividade registrada
  let atual = 0;
  while (dias.has(cursor)){ atual++; cursor = addDaysISO(cursor, -1); }

  const ordenados = [...dias].sort();
  let melhor = 0, corrente = 0, anterior = null;
  ordenados.forEach(iso => {
    if (anterior && addDaysISO(anterior, 1) === iso) corrente++;
    else corrente = 1;
    melhor = Math.max(melhor, corrente);
    anterior = iso;
  });
  return { atual, melhor: Math.max(melhor, atual), diasAtivos: ordenados, totalDiasAtivos: ordenados.length };
}

/* ---------------------------------------------------------
   ESTATÍSTICAS DE PERÍODO — usada por Evolução, Dashboard e retrospectivas
   --------------------------------------------------------- */
function estatisticasPeriodo(inicioIso, fimIso){
  const noIntervalo = iso => !!iso && iso >= inicioIso && iso <= fimIso;
  const sessoes = DB.getAll('sessoes').filter(s => s.status==='Realizada' && noIntervalo(s.data));
  const minutosEstudo = sessoes.reduce((t,s) => t+(s.duracaoMin||0), 0);
  const tarefasConcluidas = DB.getAll('tarefas').filter(t => t.status==='Concluída' && noIntervalo(t.dataConclusao));
  const tarefasConcluidasRecorrentes = DB.getAll('historico').filter(h => h.modulo==='tarefas' && h.acao==='conclusão' && noIntervalo(isoFromDate(new Date(h.timestamp))));
  const registros = DB.getAll('registros').filter(r => noIntervalo(r.data));
  const reflexoes = DB.getAll('reflexoes').filter(r => noIntervalo(r.data));
  const metasConcluidas = DB.getAll('metas').filter(m => m.status==='Concluída' && noIntervalo(m.dataConclusao));
  const rotinasRealizadas = rotinasRealizadasNoPeriodo(inicioIso, fimIso);
  let diasNoPeriodo = 1;
  const di = parseISODate(inicioIso), df = parseISODate(fimIso);
  if (di && df) diasNoPeriodo = Math.max(1, Math.round((df-di)/86400000)+1);
  const diasAtivos = [...diasAtivosSet()].filter(noIntervalo);
  return {
    minutosEstudo, sessoes: sessoes.length,
    tarefasConcluidas: Math.max(tarefasConcluidas.length, tarefasConcluidasRecorrentes.length),
    registros: registros.length, reflexoes: reflexoes.length,
    metasConcluidas: metasConcluidas.length, rotinasRealizadas: rotinasRealizadas.length,
    diasAtivos: diasAtivos.length, diasNoPeriodo,
    mediaDiariaMinutos: Math.round(minutosEstudo / diasNoPeriodo)
  };
}
function minutosEstudoPorDia(inicioIso, fimIso){
  const dias = diasDaSemana(mondayOf(inicioIso)).filter(d => d>=inicioIso && d<=fimIso);
  const lista = [];
  let d = inicioIso;
  while (d <= fimIso){ lista.push(d); d = addDaysISO(d,1); }
  const alvo = dias.length ? dias : lista;
  const sessoes = DB.getAll('sessoes').filter(s => s.status==='Realizada');
  return alvo.map(iso => ({ data: iso, minutos: sessoes.filter(s=>s.data===iso).reduce((t,s)=>t+(s.duracaoMin||0),0) }));
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES — sempre derivadas de dados reais
   --------------------------------------------------------- */
function metasSemProgressoRecente(diasLimite){
  diasLimite = diasLimite || 7;
  const hoje = todayISO();
  return DB.getAll('metas').filter(m => {
    if (m.status === 'Concluída') return false;
    const hist = m.progressoHistorico || [];
    const ultima = hist.length ? hist[hist.length-1].data : (m.criadoEm ? isoFromDate(new Date(m.criadoEm)) : null);
    if (!ultima) return false;
    const diff = daysDiffFromToday(ultima);
    return diff !== null && Math.abs(diff) >= diasLimite;
  });
}
function gerarNotificacoes(){
  const notifs = [];
  const tarefas = DB.getAll('tarefas');
  const atrasadas = tarefas.filter(tarefaAtrasada);
  if (atrasadas.length) notifs.push({ tipo:'urgente', icone:'📋', texto:`${atrasadas.length} tarefa${atrasadas.length===1?'':'s'} atrasada${atrasadas.length===1?'':'s'}`, go:()=>goToView('tarefas') });

  const revisoes = typeof revisoesPendentes === 'function' ? revisoesPendentes() : [];
  const revisoesAtrasadas = revisoes.filter(r => r.data < todayISO());
  const revisoesHoje = revisoes.filter(r => r.data === todayISO());
  if (revisoesAtrasadas.length) notifs.push({ tipo:'urgente', icone:'📚', texto:`${revisoesAtrasadas.length} revisão${revisoesAtrasadas.length===1?'':'ões'} atrasada${revisoesAtrasadas.length===1?'':'s'}`, go:()=>goToView('estudos') });
  if (revisoesHoje.length) notifs.push({ tipo:'atencao', icone:'📚', texto:`${revisoesHoje.length} revisão${revisoesHoje.length===1?'':'ões'} para hoje`, go:()=>goToView('estudos') });

  const metas = DB.getAll('metas').filter(m => m.status !== 'Concluída');
  const metasProximas = metas.filter(m => m.prazo && daysDiffFromToday(m.prazo) !== null && daysDiffFromToday(m.prazo) >= 0 && daysDiffFromToday(m.prazo) <= 3);
  metasProximas.forEach(m => notifs.push({ tipo:'atencao', icone:'🎯', texto:`Meta "${m.titulo}" com prazo próximo`, go:()=>abrirDetalheMeta(m.id) }));

  const paradas = metasSemProgressoRecente(7);
  paradas.slice(0,3).forEach(m => notifs.push({ tipo:'atencao', icone:'🎯', texto:`Meta "${m.titulo}" sem progresso há alguns dias`, go:()=>abrirDetalheMeta(m.id) }));

  const amanha = addDaysISO(todayISO(), 1);
  const compromissosAmanha = DB.getAll('eventos').filter(e => e.data === amanha && !e.concluido);
  if (compromissosAmanha.length) notifs.push({ tipo:'info', icone:'🗓️', texto:`${compromissosAmanha.length} compromisso${compromissosAmanha.length===1?'':'s'} amanhã`, go:()=>goToView('agenda') });

  const ordem = { urgente:0, atencao:1, info:2 };
  return notifs.sort((a,b) => ordem[a.tipo]-ordem[b.tipo]).slice(0, 10);
}
