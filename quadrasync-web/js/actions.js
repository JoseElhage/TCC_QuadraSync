/* ============================================================
   QuadraSync · Painel Administrativo
   actions.js → regras de reserva, bloqueio e renderização compartilhada
   ============================================================ */

/* ---------------- Slots / ocupação ---------------- */
const slotIndex = h => SLOTS.findIndex(s => s.start === h);

function covers(res, slotStart){
  const i = slotIndex(res.hora), j = slotIndex(slotStart);
  if(i < 0 || j < 0) return false;
  const n = Math.max(1, Math.round((res.duracao || 30) / 30));
  return j >= i && j < i + n;
}
const ACTIVE = ['pendente','confirmada','concluida'];
function resCovering(data, slotStart){
  return DB.res.get().find(r => r.data === data && ACTIVE.includes(r.status) && covers(r, slotStart));
}
function blockCovering(data, slotStart){
  return DB.blocks.get().find(b => b.data === data && slotStart >= b.hora && slotStart < (b.ate || endOf(b.hora)));
}
function slotState(data, slotStart){
  const b = blockCovering(data, slotStart);
  if(b) return {kind:'bloqueado', block:b};
  const r = resCovering(data, slotStart);
  if(r) return {kind:r.status === 'pendente' ? 'pendente' : (r.status === 'concluida' ? 'concluida' : 'reservada'), res:r};
  const past = data < TODAY_ISO;
  return {kind: past ? 'passado' : 'livre'};
}
function slotsOfRange(hora, duracao){
  const i = slotIndex(hora), n = Math.max(1, Math.round((duracao||30)/30));
  return SLOTS.slice(i, i + n).map(s => s.start);
}

/* ---------------- Badges ---------------- */
function statusBadge(status){
  const st = STATUS[status]; if(!st) return '';
  return `<span class="badge ${st.badge}"><span class="dot"></span>${st.label}</span>`;
}
function sportBadge(sport){
  const sp = SPORTS[sport] || SPORTS.geral;
  return `<span class="badge ${sp.badge}">${icon(sp.icon,'i sm')} ${sp.label}</span>`;
}

/* ---------------- Card de reserva ---------------- */
function resCard(r, opts={}){
  const st = STATUS[r.status];
  const d  = parseISO(r.data);
  const sp = SPORTS[r.esporte] || SPORTS.geral;

  let note = '';
  if(r.status === 'recusada' && r.motivoRecusa)
    note = `<div class="res-note danger">${icon('x-circle','i sm')} <span><strong>Recusada:</strong> ${esc(r.motivoRecusa)}${r.obs ? ' — ' + esc(r.obs) : ''}</span></div>`;
  else if(r.status === 'cancelada')
    note = `<div class="res-note">${icon('ban','i sm')} <span>${esc(r.motivoCancelamento || 'Reserva cancelada.')}</span></div>`;
  else if(r.status === 'concluida' && r.placar)
    note = `<div class="res-note warn">${icon('trophy','i sm')} <span><strong>Placar registrado:</strong> ${esc(r.placar)}</span></div>`;

  let actions = '';
  if(opts.actions !== false){
    if(r.status === 'pendente'){
      actions = `<button class="btn btn-success-soft btn-sm" data-act="aprovar" data-id="${r.id}">${icon('check','i sm')} Aprovar</button>
                 <button class="btn btn-danger-soft btn-sm" data-act="recusar" data-id="${r.id}">${icon('x','i sm')} Recusar</button>`;
    } else if(r.status === 'confirmada'){
      actions = `<button class="btn btn-outline btn-sm" data-act="detalhes" data-id="${r.id}">${icon('eye','i sm')} Detalhes</button>
                 <button class="btn btn-danger-outline btn-sm" data-act="cancelar" data-id="${r.id}">${icon('ban','i sm')} Cancelar</button>`;
    } else {
      actions = `<button class="btn btn-ghost btn-sm" data-act="detalhes" data-id="${r.id}">${icon('eye','i sm')} Detalhes</button>`;
    }
  }

  return `<article class="res-card ${opts.compact?'compact':''} st-${r.status}" data-id="${r.id}">
    <span class="avatar md ${tone(r.aluno)}">${esc(initials(r.aluno))}</span>
    <div class="grow" style="min-width:0">
      <div class="flex gap-8 wrap">
        <span class="res-who">${esc(r.aluno)}</span>
        ${statusBadge(r.status)}
      </div>
      <div class="res-meta">
        ${sportBadge(r.esporte)}
        <span>${esc(r.turma)}</span><i class="sep"></i>
        ${opts.compact ? `<span>${DOWS_SHORT[d.getDay()]} · ${fmtDate(r.data)}</span><i class="sep"></i>` : ''}
        <span>${slotLabel(r.hora)} · ${r.duracao} min</span>
        ${opts.compact ? '' : `<i class="sep"></i><span>Pedido ${timeAgo(r.criadoEm)}</span>`}
      </div>
      <div class="res-motivo">${icon('info','i sm')}<span class="truncate">${esc(r.motivo)}</span></div>
      ${note}
    </div>
    ${opts.compact ? '' : `<div class="res-when">
      <div class="res-date"><div class="d">${pad(d.getDate())}</div><div class="m">${MONTHS_SHORT[d.getMonth()]}</div></div>
      <div class="res-time">${icon('clock','i sm')} ${DOWS_SHORT[d.getDay()]} · ${r.hora}</div>
    </div>`}
    <div class="res-actions">${actions}</div>
  </article>`;
}

function summaryRows(r){
  const sp = SPORTS[r.esporte] || SPORTS.geral;
  return `<div class="summary">
    <div class="row"><span>Aluno</span><span>${esc(r.aluno)} · ${esc(r.turma)}</span></div>
    <div class="row"><span>Esporte</span><span>${sp.label}</span></div>
    <div class="row"><span>Data</span><span>${weekdayLong(r.data)}, ${fmtDateLong(r.data)}</span></div>
    <div class="row"><span>Horário</span><span>${slotLabel(r.hora)} · ${r.duracao} min</span></div>
    <div class="row"><span>Finalidade</span><span>${esc(r.motivo)}</span></div>
    <div class="row"><span>Solicitado</span><span>${timeAgo(r.criadoEm)}</span></div>
  </div>`;
}

/* ---------------- Ações ---------------- */
function findRes(id){ return DB.res.get().find(r => r.id === id); }

function approveReservation(id){
  const list = DB.res.get();
  const r = list.find(x => x.id === id); if(!r) return null;
  r.status = 'confirmada'; r.decididoEm = new Date().toISOString();
  DB.res.set(list);
  pushNotif('reserva','Reserva aprovada', `${r.aluno} (${r.turma}) teve a quadra confirmada para ${fmtDate(r.data)} às ${r.hora}.`, r.id);
  pushLog('aprovacao', `Reserva de ${r.aluno} aprovada · ${fmtDate(r.data)} ${r.hora}`);
  return r;
}

function denyReservation(id, motivo, obs){
  const list = DB.res.get();
  const r = list.find(x => x.id === id); if(!r) return null;
  r.status = 'recusada'; r.motivoRecusa = motivo; r.obs = obs || ''; r.decididoEm = new Date().toISOString();
  DB.res.set(list);
  pushNotif('reserva','Reserva recusada', `O pedido de ${r.aluno} para ${fmtDate(r.data)} às ${r.hora} foi recusado (${motivo}).`, r.id);
  pushLog('recusa', `Reserva de ${r.aluno} recusada · ${motivo}`);
  return r;
}

function cancelReservation(id, motivo){
  const list = DB.res.get();
  const r = list.find(x => x.id === id); if(!r) return null;
  r.status = 'cancelada'; r.motivoCancelamento = motivo || 'Cancelada pela secretaria'; r.decididoEm = new Date().toISOString();
  DB.res.set(list);
  pushNotif('reserva','Reserva cancelada', `A reserva de ${r.aluno} em ${fmtDate(r.data)} às ${r.hora} foi cancelada pela secretaria.`, r.id);
  pushLog('cancelamento', `Reserva de ${r.aluno} cancelada`);
  return r;
}

/* -------- Modal: aprovar -------- */
function openApproveModal(id, after){
  const r = findRes(id); if(!r) return;
  const m = Modal.open({
    title:'Aprovar reserva', subtitle:'Confirme a liberação da quadra para o aluno',
    icon:'check-circle', tone:'ico-green',
    body:`${summaryRows(r)}
      <div class="field mt-20 mb-0">
        <label class="label" for="apprObs">Mensagem ao aluno <span class="label-hint">(opcional)</span></label>
        <textarea class="textarea" id="apprObs" placeholder="Ex.: Chegue 10 minutos antes e devolva as bolas na secretaria."></textarea>
      </div>
      <label class="check mt-12"><input type="checkbox" id="apprMail" checked> Enviar confirmação por e-mail e notificação no app do aluno</label>`,
    footer:`<button class="btn btn-outline" data-close>Cancelar</button>
            <button class="btn btn-success" id="doApprove">${icon('check','i sm')} Aprovar reserva</button>`,
    onMount(box, close){
      box.querySelector('#doApprove').addEventListener('click', async ev => {
        await busy(ev.currentTarget, 700);
        approveReservation(id);
        close();
        toast('success','Reserva aprovada', `${r.aluno} · ${fmtDate(r.data)} às ${r.hora}`);
        after && after();
      });
    }
  });
  return m;
}

/* -------- Modal: recusar -------- */
function openDenyModal(id, after){
  const r = findRes(id); if(!r) return;
  const radios = DENY_REASONS.map((m,i) => `
    <label class="radio-card">
      <input type="radio" name="motivoRecusa" value="${esc(m)}" ${i===0?'checked':''}>
      <span><span class="t">${esc(m)}</span></span>
    </label>`).join('');

  Modal.open({
    title:'Recusar reserva', subtitle:`Pedido de ${esc(r.aluno)} · ${fmtDate(r.data)} às ${r.hora}`,
    icon:'x-circle', tone:'ico-red', size:'wide',
    body:`<div class="col gap-8">${radios}</div>
      <div class="field mt-16 mb-0">
        <label class="label" for="denyObs">Justificativa enviada ao aluno <span class="label-hint">(opcional)</span></label>
        <textarea class="textarea" id="denyObs" placeholder="Explique brevemente o motivo para o aluno."></textarea>
      </div>
      <label class="check mt-12"><input type="checkbox" id="denyMail" checked> Notificar o aluno sobre a recusa</label>`,
    footer:`<button class="btn btn-outline" data-close>Manter pendente</button>
            <button class="btn btn-danger" id="doDeny">${icon('x','i sm')} Recusar reserva</button>`,
    onMount(box, close){
      bindRadioCards(box);
      box.querySelector('#doDeny').addEventListener('click', async ev => {
        const motivo = box.querySelector('input[name="motivoRecusa"]:checked')?.value || DENY_REASONS[0];
        const obs = box.querySelector('#denyObs').value.trim();
        await busy(ev.currentTarget, 700);
        denyReservation(id, motivo, obs);
        close();
        toast('error','Reserva recusada', `${r.aluno} foi notificado sobre a decisão.`);
        after && after();
      });
    }
  });
}

/* -------- Modal: cancelar -------- */
function openCancelModal(id, after){
  const r = findRes(id); if(!r) return;
  Modal.open({
    title:'Cancelar reserva confirmada', subtitle:'O aluno será avisado imediatamente',
    icon:'ban', tone:'ico-red',
    body:`${summaryRows(r)}
      <div class="field mt-20 mb-0">
        <label class="label" for="cancMotivo">Motivo do cancelamento</label>
        <select class="select" id="cancMotivo">
          <option>Manutenção emergencial da quadra</option>
          <option>Evento oficial da escola</option>
          <option>Condições climáticas</option>
          <option>Determinação da coordenação</option>
          <option>Outro motivo</option>
        </select>
      </div>`,
    footer:`<button class="btn btn-outline" data-close>Voltar</button>
            <button class="btn btn-danger" id="doCancel">Cancelar reserva</button>`,
    onMount(box, close){
      box.querySelector('#doCancel').addEventListener('click', async ev => {
        await busy(ev.currentTarget, 650);
        cancelReservation(id, box.querySelector('#cancMotivo').value);
        close();
        toast('warn','Reserva cancelada', `${r.aluno} · ${fmtDate(r.data)} às ${r.hora}`);
        after && after();
      });
    }
  });
}

/* -------- Modal: detalhes -------- */
function openDetailsModal(id){
  const r = findRes(id); if(!r) return;
  const extra = [];
  if(r.decididoEm) extra.push(`<div class="row"><span>Decisão</span><span>${timeAgo(r.decididoEm)}</span></div>`);
  if(r.motivoRecusa) extra.push(`<div class="row"><span>Motivo da recusa</span><span>${esc(r.motivoRecusa)}</span></div>`);
  if(r.obs) extra.push(`<div class="row"><span>Observação</span><span>${esc(r.obs)}</span></div>`);
  if(r.placar) extra.push(`<div class="row"><span>Placar</span><span>${esc(r.placar)}</span></div>`);

  Modal.open({
    title:'Detalhes da reserva', subtitle:`Protocolo ${r.id.toUpperCase()}`,
    icon:'clipboard', tone:'ico-blue',
    body:`${summaryRows(r)}${extra.length?`<div class="summary mt-12">${extra.join('')}</div>`:''}`,
    footer:`<button class="btn btn-outline" data-close>Fechar</button>`
  });
}

/* -------- Modal: bloquear horário -------- */
function openBlockModal({data, hora}, after){
  data = data || TODAY_ISO;
  hora = hora || SLOTS[0].start;
  const d = parseISO(data);

  const optsFrom = SLOTS.map(s => `<option value="${s.start}" ${s.start===hora?'selected':''}>${s.start}</option>`).join('');
  const optsTo   = SLOTS.map(s => `<option value="${s.end}" ${s.end===endOf(hora)?'selected':''}>${s.end}</option>`).join('');
  const reasons  = BLOCK_REASONS.map((m,i)=>`<option ${i===0?'selected':''}>${esc(m)}</option>`).join('');

  Modal.open({
    title:'Bloquear horário da quadra', subtitle:`${weekdayLong(data)}, ${fmtDateLong(data)}`,
    icon:'lock', tone:'ico-red', size:'wide',
    body:`<div class="form-grid">
        <div class="field">
          <label class="label">Início do bloqueio</label>
          <select class="select" id="blkFrom">${optsFrom}</select>
        </div>
        <div class="field">
          <label class="label">Término do bloqueio</label>
          <select class="select" id="blkTo">${optsTo}</select>
        </div>
      </div>
      <div class="field">
        <label class="label" for="blkMotivo">Motivo do bloqueio <span class="req">*</span></label>
        <select class="select" id="blkMotivo">${reasons}</select>
        <div class="field-error"></div>
      </div>
      <div class="field">
        <label class="label" for="blkObs">Detalhes <span class="label-hint">(opcional — visível para os alunos no app)</span></label>
        <textarea class="textarea" id="blkObs" placeholder="Ex.: Pintura das linhas da quadra pela manhã."></textarea>
      </div>
      <div id="blkConflict"></div>
      <div class="hr"></div>
      <div class="flex gap-8 small muted">${icon('info','i sm')}
        <span>O horário bloqueado some das opções de reserva no aplicativo dos alunos e aparece riscado no calendário.</span>
      </div>`,
    footer:`<button class="btn btn-outline" data-close>Cancelar</button>
            <button class="btn btn-danger" id="doBlock">${icon('lock','i sm')} Bloquear horário</button>`,
    onMount(box, close){
      const from = box.querySelector('#blkFrom'), to = box.querySelector('#blkTo'), conf = box.querySelector('#blkConflict');

      function refreshConflicts(){
        if(to.value <= from.value){ to.value = endOf(from.value); }
        const affected = DB.res.get().filter(r => r.data === data && ACTIVE.includes(r.status)
          && slotsOfRange(r.hora, r.duracao).some(s => s >= from.value && s < to.value));
        if(!affected.length){ conf.innerHTML = ''; return; }
        conf.innerHTML = `<div class="card" style="border-color:var(--danger-border);background:var(--danger-bg)">
          <div class="card-body" style="padding:14px 16px">
            <div class="flex gap-8 semi" style="color:var(--danger)">${icon('alert','i sm')} ${affected.length} reserva(s) neste intervalo</div>
            <ul class="col gap-6 mt-8 small" style="color:#8F1D1D">
              ${affected.map(r=>`<li>• ${esc(r.aluno)} — ${slotLabel(r.hora)} (${STATUS[r.status].label})</li>`).join('')}
            </ul>
            <label class="check mt-12" style="color:#8F1D1D"><input type="checkbox" id="blkCancelRes" checked> Cancelar essas reservas e avisar os alunos</label>
          </div></div>`;
      }
      from.addEventListener('change', refreshConflicts);
      to.addEventListener('change', refreshConflicts);
      refreshConflicts();

      box.querySelector('#doBlock').addEventListener('click', async ev => {
        const motivo = box.querySelector('#blkMotivo').value;
        if(motivo === 'Outro motivo' && !box.querySelector('#blkObs').value.trim()){
          toast('warn','Descreva o motivo','Para “Outro motivo”, preencha o campo de detalhes.');
          box.querySelector('#blkObs').focus();
          return;
        }
        if(to.value <= from.value){ toast('error','Intervalo inválido','O término deve ser depois do início.'); return; }

        const session = getSession();
        const blocks = DB.blocks.get();
        blocks.push({
          id:uid('b'), data, hora:from.value, ate:to.value, motivo,
          obs:box.querySelector('#blkObs').value.trim(),
          por:session?.nome || 'Administração', criadoEm:new Date().toISOString()
        });
        DB.blocks.set(blocks);

        const cancelFlag = box.querySelector('#blkCancelRes');
        if(cancelFlag?.checked){
          DB.res.get().filter(r => r.data === data && ACTIVE.includes(r.status)
            && slotsOfRange(r.hora, r.duracao).some(s => s >= from.value && s < to.value))
            .forEach(r => cancelReservation(r.id, `Horário bloqueado — ${motivo}`));
        }

        pushNotif('bloqueio','Quadra bloqueada', `${fmtDate(data)} das ${from.value} às ${to.value} — ${motivo}.`);
        pushLog('bloqueio', `Bloqueio ${fmtDate(data)} ${from.value}–${to.value} · ${motivo}`);

        await busy(ev.currentTarget, 700);
        close();
        toast('success','Horário bloqueado', `${fmtDate(data)} · ${from.value} às ${to.value}`);
        after && after();
      });
    }
  });
}

/* -------- Desbloquear -------- */
function unblock(id, after){
  const b = DB.blocks.get().find(x => x.id === id); if(!b) return;
  Modal.confirm({
    title:'Liberar horário bloqueado', icon:'unlock', tone:'ico-green',
    message:`<p class="small muted-2">O intervalo <strong>${slotLabel(b.hora).split('–')[0]} às ${b.ate || endOf(b.hora)}</strong> de
      <strong>${fmtDateLong(b.data)}</strong> voltará a ficar disponível para reservas dos alunos.</p>
      <div class="summary mt-16">
        <div class="row"><span>Motivo</span><span>${esc(b.motivo)}</span></div>
        ${b.obs ? `<div class="row"><span>Detalhes</span><span>${esc(b.obs)}</span></div>` : ''}
        <div class="row"><span>Aplicado por</span><span>${esc(b.por)}</span></div>
      </div>`,
    confirmText:'Liberar horário', danger:false
  }).then(ok => {
    if(!ok) return;
    DB.blocks.set(DB.blocks.get().filter(x => x.id !== id));
    pushNotif('bloqueio','Bloqueio removido', `O horário de ${fmtDate(b.data)} (${b.hora} às ${b.ate || endOf(b.hora)}) está liberado novamente.`);
    pushLog('liberacao', `Bloqueio removido · ${fmtDate(b.data)} ${b.hora}`);
    toast('success','Horário liberado', `${fmtDate(b.data)} · ${b.hora} às ${b.ate || endOf(b.hora)}`);
    after && after();
  });
}

/* -------- Delegação de cliques nos cards -------- */
function bindResActions(container, after){
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if(!btn) return;
    const id = btn.dataset.id, act = btn.dataset.act;
    if(act === 'aprovar')  openApproveModal(id, after);
    if(act === 'recusar')  openDenyModal(id, after);
    if(act === 'cancelar') openCancelModal(id, after);
    if(act === 'detalhes') openDetailsModal(id);
  });
}
