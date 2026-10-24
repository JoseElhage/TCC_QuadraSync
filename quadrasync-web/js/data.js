/* ============================================================
   QuadraSync · Painel Administrativo
   data.js → ícones, dados de demonstração, storage e helpers
   ============================================================ */

/* ---------------- 1. Ícones (sprite SVG inline) ---------------- */
const QS_ICONS = {
  dashboard:'<path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M13 7h8V3h-8v4Z"/><path d="M3 21h8v-4H3v4Z"/>',
  calendar:'<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 2"/>',
  bell:'<path d="M18 8.6a6 6 0 1 0-12 0c0 5.4-2 6.9-2 6.9h16s-2-1.5-2-6.9"/><path d="M13.7 19.5a2 2 0 0 1-3.4 0"/>',
  users:'<path d="M16 20v-1.8a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20"/><circle cx="9.2" cy="7.2" r="3.6"/><path d="M22 20v-1.8a4 4 0 0 0-3-3.85"/><path d="M16.5 3.8a4 4 0 0 1 0 7"/>',
  user:'<path d="M19 20.5v-2a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 4.5 18.5v2"/><circle cx="12" cy="7.5" r="4"/>',
  shield:'<path d="M12 21.5s7.5-3.4 7.5-9.2V5.6L12 2.8 4.5 5.6v6.7c0 5.8 7.5 9.2 7.5 9.2Z"/><path d="m9.3 12.1 1.9 1.9 3.6-3.8"/>',
  logout:'<path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5"/><path d="m16 16.5 4.5-4.5L16 7.5"/><path d="M20.5 12H9.5"/>',
  check:'<path d="M20 6.5 9.4 17.1 4 11.7"/>',
  'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8.4 12.2 2.5 2.5 4.7-5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  'x-circle':'<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m5.8 5.8 12.4 12.4"/>',
  lock:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/>',
  unlock:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"/><path d="M8 10.5V7.6a4 4 0 0 1 7.8-1.2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chevL:'<path d="m14.5 5.5-7 6.5 7 6.5"/>',
  chevR:'<path d="m9.5 5.5 7 6.5-7 6.5"/>',
  chevD:'<path d="m6 9.5 6 6 6-6"/>',
  arrowLeft:'<path d="M19 12H5"/><path d="m11.5 5.5-6.5 6.5 6.5 6.5"/>',
  mail:'<rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4"/><path d="m3.4 7 7.5 5.4a2 2 0 0 0 2.2 0L20.6 7"/>',
  eye:'<path d="M2.2 12S5.8 5.6 12 5.6 21.8 12 21.8 12 18.2 18.4 12 18.4 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3.1"/>',
  'eye-off':'<path d="M10.6 6a9.9 9.9 0 0 1 1.4-.1c6.2 0 9.8 6.1 9.8 6.1a17 17 0 0 1-3 3.8M6.4 7.9A17 17 0 0 0 2.2 12s3.6 6.1 9.8 6.1a9.6 9.6 0 0 0 4-.85"/><path d="m9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/>',
  trophy:'<path fill="currentColor" stroke="none" d="M18 4h2.6a.9.9 0 0 1 .9 1.05c-.25 2.9-1.9 5.2-4.4 5.85A6 6 0 0 1 13 14.35V16.6h2.3a1.4 1.4 0 0 1 1.4 1.4v1.3a.7.7 0 0 1-.7.7H8a.7.7 0 0 1-.7-.7V18a1.4 1.4 0 0 1 1.4-1.4H11v-2.25a6 6 0 0 1-4.1-3.45C4.4 10.25 2.75 7.95 2.5 5.05A.9.9 0 0 1 3.4 4H6V2.7A.7.7 0 0 1 6.7 2h10.6a.7.7 0 0 1 .7.7V4Zm-.35 1.6v3.1c1.15-.4 1.95-1.6 2.1-3.1h-2.1ZM6.35 5.6H4.25c.15 1.5.95 2.7 2.1 3.1V5.6Z"/>',
  ball:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c3.4 3.6 3.4 9.2 0 12.8M18.4 5.6c-3.4 3.6-3.4 9.2 0 12.8"/>',
  whistle:'<path d="M13.5 8.5h6.8a1.2 1.2 0 0 1 1.2 1.2v2.1a6.5 6.5 0 1 1-8-6.3"/><circle cx="9" cy="14" r="2.2"/>',
  clipboard:'<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.6A1.6 1.6 0 0 1 10.6 2h2.8A1.6 1.6 0 0 1 15 3.6v.9"/><path d="M9 11h6M9 15h4"/>',
  alert:'<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20.2h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9.3v4M12 16.8h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5M12 7.9h.01"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  filter:'<path d="M3.5 5.5h17l-6.6 7.8v5.4l-3.8 2v-7.4L3.5 5.5Z"/>',
  edit:'<path d="M12 20.5h8.5"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L8.2 17.8l-4 1 1-4L16.4 3.6Z"/>',
  trash:'<path d="M3.8 6.2h16.4M9 6.2V4.4A1.6 1.6 0 0 1 10.6 2.8h2.8A1.6 1.6 0 0 1 15 4.4v1.8"/><path d="M18.4 6.2 17.6 20a1.8 1.8 0 0 1-1.8 1.7H8.2a1.8 1.8 0 0 1-1.8-1.7L5.6 6.2"/><path d="M10.2 10.6v6.4M13.8 10.6v6.4"/>',
  settings:'<circle cx="12" cy="12" r="3.1"/><path d="m19.6 14.4-.9-.5a6.8 6.8 0 0 0 0-3.8l.9-.5a1 1 0 0 0 .4-1.4l-1-1.8a1 1 0 0 0-1.4-.3l-.9.5a6.8 6.8 0 0 0-3.3-1.9v-1a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1a6.8 6.8 0 0 0-3.3 1.9l-.9-.5a1 1 0 0 0-1.4.3l-1 1.8a1 1 0 0 0 .4 1.4l.9.5a6.8 6.8 0 0 0 0 3.8l-.9.5a1 1 0 0 0-.4 1.4l1 1.8a1 1 0 0 0 1.4.3l.9-.5a6.8 6.8 0 0 0 3.3 1.9v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1a6.8 6.8 0 0 0 3.3-1.9l.9.5a1 1 0 0 0 1.4-.3l1-1.8a1 1 0 0 0-.4-1.4Z"/>',
  home:'<path d="M3.5 10.4 12 3.4l8.5 7"/><path d="M5.8 9.4V20a1 1 0 0 0 1 1h3.4v-5.6h3.6V21h3.4a1 1 0 0 0 1-1V9.4"/>',
  download:'<path d="M12 3.5v11"/><path d="m7.8 10.6 4.2 4.2 4.2-4.2"/><path d="M4.5 20h15"/>',
  refresh:'<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.8 4.2v5h-5"/>',
  star:'<path d="m12 3.3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9L12 3.3Z"/>',
  school:'<path d="M12 3.2 22 8l-10 4.8L2 8l10-4.8Z"/><path d="M6 10.4V16c0 1.8 2.7 3.2 6 3.2s6-1.4 6-3.2v-5.6"/><path d="M22 8v6"/>',
  chart:'<path d="M4 20.2V4"/><path d="M4 20.2h16"/><rect x="7.5" y="12" width="3" height="5.4" rx="1"/><rect x="13" y="8" width="3" height="9.4" rx="1"/><rect x="18" y="14" width="3" height="3.4" rx="1"/>',
  flame:'<path d="M12 22c3.9 0 6.5-2.5 6.5-6 0-4.5-4.5-5.5-3.5-11-3 1-5 3.5-5 6 0 1.5-1 2-1.5 1-.5 1-3 2.5-3 5 0 3.5 2.6 6 6.5 6Z"/>'
};

function injectIcons(){
  if(document.getElementById('qs-sprite')) return;
  const symbols = Object.entries(QS_ICONS).map(([k,v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`
  ).join('');
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'qs-sprite';
  svg.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden');
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML = symbols;
  document.body.appendChild(svg);
}
const icon = (name, cls='i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ---------------- 2. Helpers de data / texto ---------------- */
const pad = n => String(n).padStart(2,'0');
const D = (y,m,d) => { const x = new Date(y, m-1, d, 12, 0, 0, 0); return x; };
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return D(y,m,d); };
const addDays = (s,n) => { const d = parseISO(s); d.setDate(d.getDate()+n); return iso(d); };
const TODAY_ISO = iso(new Date());

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DOWS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const DOWS_SHORT = ['dom','seg','ter','qua','qui','sex','sáb'];

function fmtDate(s){ const d = parseISO(s); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`; }
function fmtDateLong(s){ const d = parseISO(s); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; }
function fmtDateMedium(s){ const d = parseISO(s); return `${DOWS_SHORT[d.getDay()]}, ${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`; }
function weekdayLong(s){ return DOWS[parseISO(s).getDay()]; }
function initials(name){ return name.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase(); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const AVATAR_TONES = ['','amber','purple','cyan','green'];
function tone(name){ let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_TONES[h%AVATAR_TONES.length]; }

function timeAgo(isoStr){
  const diff = (Date.now() - new Date(isoStr).getTime())/1000;
  if(diff < 60) return 'agora mesmo';
  if(diff < 3600) return `há ${Math.floor(diff/60)} min`;
  if(diff < 86400) return `há ${Math.floor(diff/3600)} h`;
  if(diff < 172800) return 'ontem';
  if(diff < 604800) return `há ${Math.floor(diff/86400)} dias`;
  const d = new Date(isoStr);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
}
function hoursAgo(h){ return new Date(Date.now() - h*3600*1000).toISOString(); }

/* ---------------- 3. Domínio ---------------- */
const SLOTS = [
  {start:'18:00', end:'18:30'},
  {start:'18:30', end:'19:00'},
  {start:'19:00', end:'19:30'},
  {start:'19:30', end:'20:00'},
  {start:'20:00', end:'20:30'},
  {start:'20:30', end:'21:00'},
  {start:'21:00', end:'21:30'}
];
const slotLabel = s => `${s} – ${endOf(s)}`;
function endOf(start){
  const hit = SLOTS.find(s=>s.start===start);
  return hit ? hit.end : start;
}
function slotEndLabel(start){ return endOf(start); }

const SPORTS = {
  futsal:   {label:'Futsal',      icon:'ball',    badge:'badge-info'},
  volei:    {label:'Vôlei',       icon:'ball',    badge:'badge-cyan'},
  basquete: {label:'Basquete',    icon:'ball',    badge:'badge-purple'},
  handebol: {label:'Handebol',    icon:'ball',    badge:'badge-warn'},
  atletismo:{label:'Atletismo',   icon:'flame',   badge:'badge-neutral'},
  geral:    {label:'Uso geral',   icon:'whistle', badge:'badge-neutral'}
};

const STATUS = {
  pendente:  {label:'Pendente',   badge:'badge-warn',    slot:'pendente',  icon:'clock'},
  confirmada:{label:'Confirmada', badge:'badge-ok',      slot:'reservada', icon:'check-circle'},
  recusada:  {label:'Recusada',   badge:'badge-danger',  slot:'pendente',  icon:'x-circle'},
  cancelada: {label:'Cancelada',  badge:'badge-neutral', slot:'past',      icon:'ban'},
  concluida: {label:'Concluída',  badge:'badge-info',    slot:'concluida', icon:'trophy'}
};
const STATUS_BLOCK = {label:'Bloqueado', badge:'badge-danger', slot:'bloqueado', icon:'lock'};

const BLOCK_REASONS = [
  'Manutenção da quadra',
  'Evento oficial da escola',
  'Aula extraordinária / recuperação',
  'Treino da equipe representante',
  'Condições climáticas',
  'Uso exclusivo da coordenação',
  'Outro motivo'
];
const DENY_REASONS = [
  'Quadra já reservada nesse horário',
  'Horário fora do período permitido',
  'Bloqueio administrativo ativo',
  'Número insuficiente de participantes',
  'Solicitado com menos de 24 h de antecedência',
  'Outro motivo'
];
/* Turmas oficiais da escola */
const TURMAS = ['1º DS','2º DS','3º DS','1º ADM','2º ADM','3º ADM','2º AUT','3º AUT','1º RH'];

const MOD_ROLES = [
  {id:'placar',   label:'Placar & resultados', desc:'Registra o placar final dos jogos da Etec League.'},
  {id:'chave',    label:'Organização de chaveamento', desc:'Monta e ajusta chaves, confrontos e tabelas.'},
  {id:'completo', label:'Moderação completa', desc:'Placar, chaveamento e apoio aos jogos do torneio.'}
];
const MOD_ROLE_LABEL = {placar:'Placar & resultados', chave:'Chaveamento', completo:'Moderação completa'};

/* ---------------- 4. Storage ---------------- */
const K = {
  session:'qs.session', users:'qs.users', res:'qs.reservations',
  notifs:'qs.notifications', blocks:'qs.blocks', mods:'qs.moderators',
  students:'qs.students', prefs:'qs.preferences', log:'qs.log', seeded:'qs.seeded.v3'
};
const load = (k, fb) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }catch(e){ return fb; } };
const save = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
const uid = p => `${p}-${Math.random().toString(36).slice(2,8)}`;

/* ---------------- 5. Seed ---------------- */
function seed(){
  const admin = {
    id:'adm-1', nome:'Cláudia Ferreira', email:'claudia.ferreira@etec.sp.gov.br',
    senha:'quadra123', matricula:'SEC-2024-118', setor:'Secretaria Acadêmica',
    cargo:'Administradora · Secretaria', telefone:'(19) 99812-4477', desde:'2024-02-05'
  };
  save(K.users,[admin]);

  save(K.students,[
    {id:'al-01', nome:'Lucas Almeida',      turma:'3º DS'},
    {id:'al-02', nome:'Mariana Souza',      turma:'2º ADM'},
    {id:'al-03', nome:'Pedro Henrique Lima',turma:'1º DS'},
    {id:'al-04', nome:'Beatriz Nunes',      turma:'3º ADM'},
    {id:'al-05', nome:'Gabriel Rocha',      turma:'2º AUT'},
    {id:'al-06', nome:'Ana Clara Dias',     turma:'1º RH'},
    {id:'al-07', nome:'Rafael Moreira',     turma:'3º DS'},
    {id:'al-08', nome:'Juliana Prado',      turma:'2º ADM'},
    {id:'al-09', nome:'Thiago Barbosa',     turma:'3º AUT'},
    {id:'al-10',nome:'Larissa Campos',     turma:'3º ADM'},
    {id:'al-11',nome:'Vinícius Tavares',   turma:'2º DS'},
    {id:'al-12',nome:'Camila Rodrigues',   turma:'1º ADM'}
  ]);

  save(K.mods,[
    {id:'md-1', nome:'Bruno Oliveira', turma:'3º DS', papel:'completo', desde:addDays(TODAY_ISO,-46), jogos:18},
    {id:'md-2', nome:'Isabela Martins',turma:'2º ADM', papel:'placar',   desde:addDays(TODAY_ISO,-21), jogos:9},
    {id:'md-3', nome:'Felipe Costa',   turma:'3º AUT',  papel:'chave',    desde:addDays(TODAY_ISO,-8),  jogos:4}
  ]);

  save(K.res,[
    {id:'r-101', aluno:'Lucas Almeida',       turma:'3º DS', esporte:'futsal',   data:addDays(TODAY_ISO,1),  hora:'19:00', duracao:60, motivo:'Jogo amistoso · 3º DS x 2º AUT',      status:'pendente',   criadoEm:hoursAgo(3)},
    {id:'r-102', aluno:'Beatriz Nunes',       turma:'3º ADM', esporte:'volei',    data:addDays(TODAY_ISO,2),  hora:'20:00', duracao:60, motivo:'Treino do time feminino de vôlei',        status:'pendente',   criadoEm:hoursAgo(9)},
    {id:'r-103', aluno:'Thiago Barbosa',      turma:'3º AUT',  esporte:'basquete', data:addDays(TODAY_ISO,5),  hora:'18:30', duracao:90, motivo:'Treino livre de basquete',                status:'pendente',   criadoEm:hoursAgo(26)},
    {id:'r-104', aluno:'Larissa Campos',      turma:'3º ADM',  esporte:'futsal',   data:addDays(TODAY_ISO,4),  hora:'19:30', duracao:60, motivo:'Etec League · Semifinal (Chave B)',       status:'pendente',   criadoEm:hoursAgo(31)},
    {id:'r-105', aluno:'Mariana Souza',       turma:'2º ADM',  esporte:'volei',    data:addDays(TODAY_ISO,2),  hora:'18:00', duracao:60, motivo:'Treino de vôlei misto',                   status:'confirmada', criadoEm:hoursAgo(52), decididoEm:hoursAgo(40)},
    {id:'r-106', aluno:'Vinícius Tavares',    turma:'2º DS',   esporte:'futsal',   data:addDays(TODAY_ISO,5),  hora:'20:30', duracao:60, motivo:'Confraternização da turma',               status:'confirmada', criadoEm:hoursAgo(70), decididoEm:hoursAgo(50)},
    {id:'r-107', aluno:'Gabriel Rocha',       turma:'2º AUT',  esporte:'basquete', data:addDays(TODAY_ISO,0),  hora:'19:00', duracao:60, motivo:'Treino de arremessos',                    status:'confirmada', criadoEm:hoursAgo(96), decididoEm:hoursAgo(80)},
    {id:'r-108', aluno:'Ana Clara Dias',      turma:'1º RH',  esporte:'geral',    data:addDays(TODAY_ISO,-2), hora:'18:00', duracao:120,motivo:'Etec League · Rodada 4 (3 jogos)',        status:'concluida',  criadoEm:hoursAgo(150), decididoEm:hoursAgo(140), placar:'3 jogos · 2 vitórias do 1º RH'},
    {id:'r-109', aluno:'Rafael Moreira',      turma:'3º DS',   esporte:'futsal',   data:addDays(TODAY_ISO,-5), hora:'20:00', duracao:60, motivo:'Jogo amistoso',                            status:'concluida',  criadoEm:hoursAgo(170), decididoEm:hoursAgo(160), placar:'4 x 2'},
    {id:'r-110', aluno:'Pedro Henrique Lima', turma:'1º DS',   esporte:'handebol', data:addDays(TODAY_ISO,1),  hora:'18:00', duracao:60, motivo:'Treino de handebol',                       status:'recusada',   criadoEm:hoursAgo(60), decididoEm:hoursAgo(20), motivoRecusa:'Horário fora do período permitido', obs:'A quadra libera apenas a partir das 18h30 para uso externo.'},
    {id:'r-111', aluno:'Juliana Prado',       turma:'2º ADM', esporte:'volei',    data:addDays(TODAY_ISO,-1), hora:'19:00', duracao:60, motivo:'Treino de vôlei',                          status:'cancelada',  criadoEm:hoursAgo(120), decididoEm:hoursAgo(100), motivoCancelamento:'Cancelada pela aluna'}
  ]);

  save(K.blocks,[
    {id:'b-1', data:addDays(TODAY_ISO,6), hora:'18:00', ate:'19:30', motivo:'Manutenção da quadra', obs:'Pintura das linhas e troca das redes.', por:'Cláudia Ferreira', criadoEm:hoursAgo(30)},
    {id:'b-2', data:TODAY_ISO,            hora:'20:00', ate:'21:30', motivo:'Evento oficial da escola', obs:'Reunião de pais e mestres no ginásio.', por:'Cláudia Ferreira', criadoEm:hoursAgo(72)},
    {id:'b-3', data:addDays(TODAY_ISO,7), hora:'18:00', ate:'21:30', motivo:'Treino da equipe representante', obs:'Seletiva para os Jogos Escolares.', por:'Cláudia Ferreira', criadoEm:hoursAgo(12)},
    {id:'b-4', data:addDays(TODAY_ISO,-1),hora:'19:00', ate:'20:00', motivo:'Aula extraordinária / recuperação', obs:'Recuperação paralela de Educação Física.', por:'Cláudia Ferreira', criadoEm:hoursAgo(96)}
  ]);

  save(K.notifs,[
    {id:'n-1', tipo:'reserva',    titulo:'Nova solicitação de reserva', texto:'Lucas Almeida (3º DS) pediu a quadra amanhã às 19h00 para um jogo amistoso de futsal.', at:hoursAgo(3),  lido:false, ref:'r-101'},
    {id:'n-2', tipo:'bloqueio',   titulo:`Bloqueio aplicado em ${fmtDate(addDays(TODAY_ISO,6))}`, texto:'Você bloqueou a quadra das 18h00 às 19h30 — Manutenção da quadra.',      at:hoursAgo(30), lido:false},
    {id:'n-3', tipo:'moderador',  titulo:'Novo moderador promovido',    texto:'Felipe Costa (3º AUT) agora pode organizar o chaveamento da Etec League.',                 at:hoursAgo(50), lido:false, ref:'md-3'},
    {id:'n-4', tipo:'reserva',    titulo:'Reserva confirmada',          texto:'Mariana Souza teve o treino de vôlei confirmado para as 18h00.',                            at:hoursAgo(40), lido:true,  ref:'r-105'},
    {id:'n-5', tipo:'sistema',    titulo:'Etec League · Rodada 5',      texto:'Chaveamento da rodada 5 publicado pelos moderadores. 3 jogos agendados.',                   at:hoursAgo(8),  lido:true},
    {id:'n-6', tipo:'reserva',    titulo:'Reserva recusada',            texto:'Pedro Henrique Lima foi notificado sobre a recusa do pedido de handebol.',                  at:hoursAgo(20), lido:true,  ref:'r-110'}
  ]);

  save(K.prefs,{ emailReservas:true, emailModeradores:true, resumoSemanal:true, som:false, tema:'claro' });
  save(K.log,[
    {id:'l-1', at:hoursAgo(50), tipo:'promocao', texto:'Felipe Costa promovido a moderador (Chaveamento)'},
    {id:'l-2', at:hoursAgo(30), tipo:'bloqueio', texto:'Quadra bloqueada em '+fmtDate(addDays(TODAY_ISO,6))+' · Manutenção'},
    {id:'l-3', at:hoursAgo(20), tipo:'recusa',   texto:'Pedido de Pedro Henrique Lima recusado'}
  ]);
  save(K.seeded, true);
}

/* dados salvos usam somente turmas oficiais? */
function turmasConsistentes(){
  const ok = t => TURMAS.includes(t);
  return DB.students.get().every(s=>ok(s.turma))
      && DB.res.get().every(r=>ok(r.turma))
      && DB.mods.get().every(m=>ok(m.turma));
}

function bootData(){
  injectIcons();
  const seedsAntigos = ['qs.seeded.v1','qs.seeded.v2'].some(k=>{ try{ return localStorage.getItem(k)!==null; }catch(e){ return false; } });
  if(!load(K.seeded,false) || seedsAntigos || !turmasConsistentes()){
    ['qs.seeded.v1','qs.seeded.v2'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    seed();
  }
  applyTheme();
}

function resetDemo(){
  [K.session,K.users,K.res,K.notifs,K.blocks,K.mods,K.students,K.prefs,K.log,K.seeded].forEach(k=>localStorage.removeItem(k));
  seed();
  applyTheme();
}

/* ---------------- 6. Tema ---------------- */
function applyTheme(){
  const t = load(K.prefs,{tema:'claro'}).tema || 'claro';
  document.documentElement.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light');
}
function setTheme(t){
  const p = load(K.prefs,{tema:'claro'}); p.tema = t; save(K.prefs,p); applyTheme();
}

/* ---------------- 7. Sessão ---------------- */
function getSession(){ return load(K.session,null); }
function setSession(u){ save(K.session,u); }
function clearSession(){ localStorage.removeItem(K.session); }
function requireSession(){
  const s = getSession();
  if(!s){ location.replace('login.html'); return null; }
  return s;
}
function logout(){
  clearSession();
  localStorage.setItem('qs.flash', JSON.stringify({tipo:'success', titulo:'Sessão encerrada', msg:'Você saiu do painel com segurança.'}));
  location.href = 'login.html';
}
function takeFlash(){
  const f = localStorage.getItem('qs.flash');
  localStorage.removeItem('qs.flash');
  return f ? JSON.parse(f) : null;
}
function flash(tipo,titulo,msg){ localStorage.setItem('qs.flash', JSON.stringify({tipo,titulo,msg})); }

/* ---------------- 8. Toast ---------------- */
function toast(tipo='info', titulo='', msg=''){
  let host = document.getElementById('toasts');
  if(!host){ host = document.createElement('div'); host.id='toasts'; document.body.appendChild(host); }
  const ico = {success:'check-circle', error:'x-circle', warn:'alert', info:'info'}[tipo] || 'info';
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span class="ico">${icon(ico,'i')}</span><div class="grow"><div class="t">${esc(titulo)}</div>${msg?`<div class="m">${esc(msg)}</div>`:''}</div>
    <button class="mini-btn" aria-label="Fechar">${icon('x','i')}</button>`;
  host.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(()=>el.remove(),220); };
  el.querySelector('button').addEventListener('click', kill);
  setTimeout(kill, 4600);
}

/* botão em estado de carregamento */
function busy(btn, ms=750){
  if(!btn) return Promise.resolve();
  const html = btn.innerHTML;
  btn.classList.add('is-loading'); btn.disabled = true;
  btn.innerHTML = `<svg class="i sm spin" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9" /></svg> Aguarde…`;
  return new Promise(r=>setTimeout(()=>{ btn.classList.remove('is-loading'); btn.disabled=false; btn.innerHTML=html; r(); }, ms));
}

/* ---------------- 9. Repositório ---------------- */
const DB = {
  res:      { get:()=>load(K.res,[]),      set:v=>save(K.res,v) },
  notifs:   { get:()=>load(K.notifs,[]),   set:v=>save(K.notifs,v) },
  blocks:   { get:()=>load(K.blocks,[]),   set:v=>save(K.blocks,v) },
  mods:     { get:()=>load(K.mods,[]),     set:v=>save(K.mods,v) },
  students: { get:()=>load(K.students,[]), set:v=>save(K.students,v) },
  prefs:    { get:()=>load(K.prefs,{emailReservas:true,emailModeradores:true,resumoSemanal:true,som:false,tema:'claro'}), set:v=>save(K.prefs,v) },
  log:      { get:()=>load(K.log,[]),      set:v=>save(K.log,v) },
  users:    { get:()=>load(K.users,[]),    set:v=>save(K.users,v) }
};

function pushNotif(tipo, titulo, texto, ref){
  const n = DB.notifs.get();
  n.unshift({id:uid('n'), tipo, titulo, texto, at:new Date().toISOString(), lido:false, ref});
  DB.notifs.set(n.slice(0,60));
}
function pushLog(tipo, texto){
  const l = DB.log.get();
  l.unshift({id:uid('l'), at:new Date().toISOString(), tipo, texto});
  DB.log.set(l.slice(0,40));
}
function unreadCount(){ return DB.notifs.get().filter(n=>!n.lido).length; }
function pendenteCount(){ return DB.res.get().filter(r=>r.status==='pendente').length; }

/* reserva por (data, hora) */
function resAt(data, hora){ return DB.res.get().find(r => r.data===data && r.hora===hora && ['pendente','confirmada','concluida'].includes(r.status)); }
function blockAt(data, hora){
  return DB.blocks.get().find(b => b.data===data && hora >= b.hora && hora < (b.ate || endOf(b.hora)));
}

/* inicialização global */
bootData();
