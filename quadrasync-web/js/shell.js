/* ============================================================
   QuadraSync · Painel Administrativo
   shell.js → sidebar, topbar, modais e navegação
   ============================================================ */

const NAV = [
  {id:'dashboard',    label:'Dashboard',    href:'index.html',         icon:'dashboard'},
  {id:'reservas',     label:'Reservas',     href:'reservas.html',      icon:'clipboard', badge:'pendentes'},
  {id:'calendario',   label:'Calendário',   href:'calendario.html',    icon:'calendar'},
  {id:'notificacoes', label:'Notificações', href:'notificacoes.html',  icon:'bell',      badge:'unread'},
  {id:'moderadores',  label:'Moderadores',  href:'moderadores.html',   icon:'shield'},
  {id:'perfil',       label:'Meu perfil',   href:'perfil.html',        icon:'user'}
];

function badgeValue(kind){
  if(kind === 'pendentes') return pendenteCount();
  if(kind === 'unread')    return unreadCount();
  return 0;
}

/* ---------- Sidebar ---------- */
function buildSidebar(active, user){
  const links = NAV.map(n=>{
    const b = n.badge ? badgeValue(n.badge) : 0;
    return `<a class="side-link ${n.id===active?'active':''}" href="${n.href}">
      ${icon(n.icon)}<span>${n.label}</span>${b?`<span class="pill">${b}</span>`:''}</a>`;
  }).join('');

  return `<aside class="sidebar" id="sidebar">
    <div class="side-brand">
      <div class="brand-mark">${icon('ball')}</div>
      <div class="brand-txt"><strong>QuadraSync</strong><span>Painel Admin</span></div>
    </div>

    <div class="side-section">Gestão da quadra</div>
    <nav class="side-nav">${links}</nav>

    <div class="side-spacer"></div>

    <div class="side-league">
      <div class="row">${icon('trophy')} Etec League</div>
      <p>Temporada 2026 · 4 rodadas concluídas. Moderadores cuidam do placar e do chaveamento.</p>
    </div>

    <div class="side-user">
      <span class="avatar sm">${esc(initials(user.nome))}</span>
      <div class="grow" style="min-width:0">
        <div class="n truncate">${esc(user.nome)}</div>
        <div class="r truncate">${esc(user.setor || 'Secretaria')}</div>
      </div>
      <button class="mini-btn" id="btnLogoutSide" title="Sair" style="color:#BFDBFE">${icon('logout','i')}</button>
    </div>
  </aside>`;
}

/* ---------- Topbar ---------- */
function buildTopbar(cfg, user){
  const n = unreadCount();
  return `<header class="topbar">
    <button class="icon-btn menu-btn" id="btnMenu" aria-label="Abrir menu">${icon('menu')}</button>
    <div class="grow" style="min-width:0">
      <h1 class="truncate">${esc(cfg.title)}</h1>
      ${cfg.subtitle ? `<div class="sub truncate">${esc(cfg.subtitle)}</div>` : ''}
    </div>
    <div class="top-actions">
      <div class="flex gap-8" id="pageActions"></div>
      <a class="icon-btn" href="notificacoes.html" aria-label="Notificações" title="Notificações">
        ${icon('bell')} ${n?`<span class="ndot">${n>9?'9+':n}</span>`:''}
      </a>
      <div style="position:relative">
        <button class="user-chip" id="btnUser" aria-haspopup="true" aria-expanded="false">
          <span class="avatar sm">${esc(initials(user.nome))}</span>
          <span class="txt col" style="align-items:flex-start;line-height:1.15">
            <span class="n truncate" style="max-width:120px">${esc(user.nome.split(' ')[0])}</span>
            <span class="r">Administrador</span>
          </span>
          ${icon('chevD','i sm')}
        </button>
        <div class="dropdown" id="userMenu" role="menu">
          <div class="dd-head">
            <div class="n truncate">${esc(user.nome)}</div>
            <div class="e truncate">${esc(user.email)}</div>
          </div>
          <a class="dd-item" href="perfil.html" role="menuitem">${icon('user','i sm')} Meu perfil</a>
          <a class="dd-item" href="notificacoes.html" role="menuitem">${icon('bell','i sm')} Notificações</a>
          <a class="dd-item" href="#" id="ddTheme" role="menuitem">${icon('settings','i sm')} Tema: <span id="ddThemeVal">${DB.prefs.get().tema}</span></a>
          <button class="dd-item danger" id="ddLogout" role="menuitem">${icon('logout','i sm')} Sair da conta</button>
        </div>
      </div>
    </div>
  </header>
  <div class="scrim" id="scrim"></div>`;
}

/* ---------- Montagem da página ---------- */
function mountShell(activeId, cfg){
  const user = requireSession();
  if(!user) return null;

  const sidebarHost = document.getElementById('sidebarHost');
  const topbarHost  = document.getElementById('topbarHost');
  if(sidebarHost) sidebarHost.innerHTML = buildSidebar(activeId, user);
  if(topbarHost)  topbarHost.innerHTML  = buildTopbar(cfg || {}, user);

  /* menu mobile */
  const sidebar = document.getElementById('sidebar');
  const scrim   = document.getElementById('scrim');
  const openNav  = () => { sidebar?.classList.add('open'); scrim?.classList.add('open'); };
  const closeNav = () => { sidebar?.classList.remove('open'); scrim?.classList.remove('open'); };
  document.getElementById('btnMenu')?.addEventListener('click', openNav);
  scrim?.addEventListener('click', closeNav);
  document.querySelectorAll('.side-link').forEach(a=>a.addEventListener('click', closeNav));

  /* dropdown do usuário */
  const btnUser = document.getElementById('btnUser');
  const menu    = document.getElementById('userMenu');
  btnUser?.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    btnUser.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', () => menu?.classList.remove('open'));
  menu?.addEventListener('click', e => e.stopPropagation());

  document.getElementById('ddTheme')?.addEventListener('click', e => {
    e.preventDefault();
    const atual = DB.prefs.get().tema === 'escuro' ? 'claro' : 'escuro';
    setTheme(atual);
    document.getElementById('ddThemeVal').textContent = atual;
    toast('info','Tema alterado', `Interface agora no tema ${atual}.`);
  });
  document.getElementById('ddLogout')?.addEventListener('click', logout);
  document.getElementById('btnLogoutSide')?.addEventListener('click', logout);

  /* flash vindo de outra página */
  const f = takeFlash();
  if(f) setTimeout(()=>toast(f.tipo, f.titulo, f.msg), 250);

  document.title = `${cfg?.title || 'Painel'} · QuadraSync Admin`;
  return user;
}

/* ============================================================
   Modais
   ============================================================ */
const Modal = (() => {
  let root = null, current = null;

  function ensureRoot(){
    if(root) return root;
    root = document.createElement('div');
    root.className = 'modal-root';
    root.id = 'modalRoot';
    root.innerHTML = `<div class="modal-back" data-close></div><div class="modal" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', e => { if(e.target.hasAttribute('data-close')) close(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && root.classList.contains('open')) close(); });
    return root;
  }

  function open({title, subtitle, icon:ic='info', tone='ico-blue', body='', footer='', size='', onMount}){
    const r = ensureRoot();
    const box = r.querySelector('.modal');
    box.className = `modal ${size}`;
    box.innerHTML = `
      <div class="modal-head">
        <div class="ico ${tone}">${icon(ic,'i lg')}</div>
        <div class="grow"><h3>${title}</h3>${subtitle?`<p>${subtitle}</p>`:''}</div>
        <button class="mini-btn x" data-close aria-label="Fechar">${icon('x','i')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer?`<div class="modal-foot">${footer}</div>`:''}`;
    r.classList.add('open');
    document.body.style.overflow = 'hidden';
    current = box;
    if(onMount) onMount(box, close);
    box.querySelector('input,select,textarea,button.btn-primary')?.focus();
    return {el:box, close};
  }

  function close(){
    if(!root) return;
    root.classList.remove('open');
    document.body.style.overflow = '';
    current = null;
  }

  function confirm({title, subtitle, message, icon:ic='alert', tone='ico-red', confirmText='Confirmar', cancelText='Cancelar', danger=false}){
    return new Promise(resolve => {
      const m = open({
        title, subtitle, icon:ic, tone,
        body: message,
        footer: `<button class="btn btn-outline" data-no>${cancelText}</button>
                 <button class="btn ${danger?'btn-danger':'btn-primary'}" data-yes>${confirmText}</button>`
      });
      m.el.querySelector('[data-no]').addEventListener('click', ()=>{ close(); resolve(false); });
      m.el.querySelector('[data-yes]').addEventListener('click', ()=>{ close(); resolve(true); });
    });
  }

  return {open, close, confirm};
})();

/* ---------- Radios estilizados (cartões) ---------- */
function bindRadioCards(scope=document){
  scope.querySelectorAll('.radio-card').forEach(card => {
    const input = card.querySelector('input');
    const sync = () => {
      const name = input?.name;
      scope.querySelectorAll(`.radio-card input[name="${name}"]`).forEach(i => i.closest('.radio-card').classList.toggle('selected', i.checked));
    };
    card.addEventListener('click', e => { if(e.target !== input){ input.checked = true; input.dispatchEvent(new Event('change',{bubbles:true})); } });
    input?.addEventListener('change', sync);
    sync();
  });
}

/* ---------- Validação simples de formulários ---------- */
function setInvalid(input, msg){
  const f = input.closest('.field'); if(!f) return;
  f.classList.add('invalid');
  const e = f.querySelector('.field-error');
  if(e) e.innerHTML = `${icon('alert','i sm')}<span>${msg}</span>`;
}
function clearInvalid(input){ input.closest('.field')?.classList.remove('invalid'); }
function bindLiveValidation(form){
  form.querySelectorAll('input,select,textarea').forEach(i => i.addEventListener('input', ()=>clearInvalid(i)));
}
const isEmail = v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
