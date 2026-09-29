(() => {
  'use strict';

  const CFG = window.CAMP_CONFIG || {};
  const CLOUD_READY = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const STORAGE_KEY = 'platz161_state_v2';
  const MODE_KEY = 'platz161_mode';
  const RECORD_TYPE = 'app_state';

  let sb = null;
  let session = null;
  let cloudRecordId = null;
  let deferredInstallPrompt = null;
  let activeView = 'dashboard';
  let activeTab = { organize: 'shopping', costs: 'overview', care: 'lawn', more: 'site' };
  let savingTimer = null;
  let state = loadLocal();

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const today = () => new Date().toISOString().slice(0, 10);
  const yearNow = () => new Date().getFullYear();
  const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const money = v => new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'}).format(n(v));
  const num = (v, digits = 0) => new Intl.NumberFormat('de-DE', {maximumFractionDigits:digits, minimumFractionDigits:0}).format(n(v));
  const fmtDate = v => v ? new Intl.DateTimeFormat('de-DE').format(new Date(`${v}T12:00:00`)) : '–';
  const daysBetween = (a, b) => {
    if (!a || !b) return 0;
    const x = new Date(`${a}T12:00:00`), y = new Date(`${b}T12:00:00`);
    return Math.max(0, Math.round((y - x) / 86400000));
  };

  function defaultState() {
    return {
      version: 2,
      site: { campName: 'Campingplatz', pitch: '161', area: '', notes: '' },
      family: [
        {id:id(), name:'Marcel', role:'Eltern'},
        {id:id(), name:'Denise', role:'Eltern'},
        {id:id(), name:'Leon', role:'Kind'},
        {id:id(), name:'Luca', role:'Kind'}
      ],
      nextArrival: '',
      shopping: [],
      tasks: [],
      inventory: [],
      costs: [],
      petroleum: [],
      electricity: [],
      stays: [],
      lawn: [],
      hedge: [],
      contracts: [],
      gasChecks: [],
      seasonStart: defaultChecklist('start'),
      winter: defaultChecklist('winter')
    };
  }

  function defaultChecklist(kind) {
    const start = ['Wasser anschließen / prüfen','Stromversorgung prüfen','Kühlschrank einschalten','Petroleum-Bestand prüfen','Zelt / Vorzelt kontrollieren','Möbel und Geräte aufstellen','Rasenfläche kontrollieren'];
    const winter = ['Wasser abstellen und Leitungen entleeren','Stromgeräte abschalten','Kühlschrank leeren und offen lassen','Petroleum sicher lagern','Polster trocken einlagern','Zelt / Vorzelt kontrollieren','Lose Gegenstände sichern'];
    return (kind === 'start' ? start : winter).map(text => ({id:id(), text, done:false}));
  }

  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = {...d, ...s};
    ['shopping','tasks','inventory','costs','petroleum','electricity','stays','lawn','hedge','contracts','gasChecks','seasonStart','winter','family'].forEach(k => {
      if (!Array.isArray(out[k])) out[k] = d[k];
    });
    out.site = {...d.site, ...(out.site || {})};
    return out;
  }

  function loadLocal() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return defaultState(); }
  }

  function storeLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function setSyncBadge(mode, text) {
    const b = $('#syncBadge');
    b.className = `status ${mode}`;
    b.textContent = text;
  }

  async function saveState({immediate = false} = {}) {
    storeLocal();
    renderTop();
    if (!session || !sb || localStorage.getItem(MODE_KEY) === 'local') return;
    clearTimeout(savingTimer);
    const fn = async () => {
      setSyncBadge('syncing','Speichert…');
      try {
        if (cloudRecordId) {
          const { error } = await sb.from('camp_records').update({data: state}).eq('id', cloudRecordId);
          if (error) throw error;
        } else {
          const { data, error } = await sb.from('camp_records').insert({type: RECORD_TYPE, data: state}).select('id').single();
          if (error) throw error;
          cloudRecordId = data.id;
        }
        setSyncBadge('cloud','Synchron');
      } catch (e) {
        console.error(e);
        setSyncBadge('offline','Nicht synchron');
        toast('Cloud-Speicherung fehlgeschlagen');
      }
    };
    if (immediate) await fn(); else savingTimer = setTimeout(fn, 450);
  }

  async function loadCloud() {
    setSyncBadge('syncing','Lädt…');
    const { data, error } = await sb.from('camp_records').select('id,data,updated_at').eq('type', RECORD_TYPE).order('updated_at', {ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    if (data) {
      cloudRecordId = data.id;
      state = normalize(data.data);
      storeLocal();
    } else {
      await saveState({immediate:true});
    }
    setSyncBadge('cloud','Synchron');
  }

  function renderTop() {
    $('#campNameTop').textContent = `${state.site.campName || 'Campingplatz'} · Platz ${state.site.pitch || '161'}`;
  }

  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }
  function badge(text, cls = '') { return `<span class="badge ${cls}">${esc(text)}</span>`; }

  function nextArrivalInfo() {
    if (!state.nextArrival) return {label:'Noch nicht geplant', days:null};
    const t = new Date(`${today()}T12:00:00`), a = new Date(`${state.nextArrival}T12:00:00`);
    const diff = Math.ceil((a - t)/86400000);
    if (diff === 0) return {label:'Heute',days:0};
    if (diff === 1) return {label:'Morgen',days:1};
    if (diff > 1) return {label:`in ${diff} Tagen`,days:diff};
    return {label:fmtDate(state.nextArrival),days:diff};
  }

  function totalNights(year = null) {
    return state.stays.reduce((sum, x) => {
      if (!x.arrival || !x.departure) return sum;
      if (year && Number(x.arrival.slice(0,4)) !== Number(year)) return sum;
      return sum + daysBetween(x.arrival, x.departure);
    }, 0);
  }

  function petroleumStock() {
    return state.petroleum.reduce((sum, x) => sum + (x.kind === 'purchase' ? n(x.liters) : -n(x.liters)), 0);
  }

  function currentYearCostData(year = yearNow()) {
    const base = {annual:0,electricity:0,petroleum:0,repairs:0,purchases:0,other:0};
    state.costs.filter(x => Number(x.year) === Number(year)).forEach(x => base[x.category] = (base[x.category] || 0) + n(x.amount));
    state.petroleum.filter(x => x.kind === 'purchase' && Number((x.date||'').slice(0,4)) === Number(year)).forEach(x => base.petroleum += n(x.price));
    state.electricity.filter(x => Number(x.year) === Number(year)).forEach(x => base.electricity += n(x.cost) + n(x.meterRent));
    return base;
  }

  function renderDashboard() {
    const arr = nextArrivalInfo();
    const openShop = state.shopping.filter(x => !x.done).length;
    const openTasks = state.tasks.filter(x => !x.done).length;
    const y = yearNow();
    const totalCosts = Object.values(currentYearCostData(y)).reduce((a,b)=>a+b,0);
    $('#view-dashboard').innerHTML = `
      <div class="hero">
        <div class="hero-copy">
          <div class="badge">Familien-CampManager</div>
          <h1>Die Hentschel's</h1>
          <p>${esc(state.site.campName || 'Campingplatz')} · Platz ${esc(state.site.pitch || '161')}</p>
        </div>
        <img class="hero-logo" src="assets/logo.jpg" alt="Die Hentschel's Platz 161">
      </div>
      <div class="grid">
        <button class="card card-action" data-open="arrival"><h3>Nächste Anreise</h3><div class="metric">${state.nextArrival ? fmtDate(state.nextArrival) : '–'}</div><p>${esc(arr.label)}</p></button>
        <button class="card card-action" data-go="organize" data-tab="shopping"><h3>Offene Einkäufe</h3><div class="metric">${openShop}</div><p>noch zu besorgen</p></button>
        <button class="card card-action" data-go="organize" data-tab="tasks"><h3>Offene Aufgaben</h3><div class="metric">${openTasks}</div><p>noch zu erledigen</p></button>
        <button class="card card-action" data-go="more" data-tab="stays"><h3>Übernachtungen ${y}</h3><div class="metric">${totalNights(y)}</div><p>Gesamt: ${totalNights()} Nächte</p></button>
        <button class="card card-action" data-go="costs" data-tab="petroleum"><h3>Petroleum</h3><div class="metric">${num(petroleumStock(),1)} <small>Liter</small></div><p>aktueller Bestand</p></button>
        <button class="card card-action" data-go="costs" data-tab="overview"><h3>Kosten ${y}</h3><div class="metric">${money(totalCosts)}</div><p>Jahresübersicht</p></button>
        <div class="card full">
          <h2>Schnellzugriff</h2>
          <div class="quick-grid">
            <button class="quick" data-add="shopping"><b>＋</b><small>Einkauf</small></button>
            <button class="quick" data-add="task"><b>✓</b><small>Aufgabe</small></button>
            <button class="quick" data-add="stay"><b>☾</b><small>Übernachtung</small></button>
            <button class="quick" data-add="petroleum"><b>⛽</b><small>Petroleum</small></button>
          </div>
        </div>
        ${upcomingCards()}
      </div>`;
  }

  function upcomingCards() {
    const now = new Date(`${today()}T12:00:00`);
    const items = [];
    state.gasChecks.forEach(x => {
      if (x.nextDue) items.push({date:x.nextDue, title:'Gasprüfung', detail:x.company || 'Nächste Prüfung'});
    });
    state.contracts.forEach(x => {
      if (x.noticeDate) items.push({date:x.noticeDate, title:`Vertrag: ${x.name}`, detail:'Kündigungs-/Prüffrist'});
      else if (x.endDate) items.push({date:x.endDate, title:`Vertrag: ${x.name}`, detail:'Vertragsende'});
    });
    items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const next = items.filter(x => new Date(`${x.date}T12:00:00`) >= now).slice(0,4);
    return `<div class="card full"><h2>Nächste Termine</h2>${next.length ? `<div class="list">${next.map(x => `<div class="row"><div class="row-main"><div class="row-title">${esc(x.title)}</div><div class="row-sub">${esc(x.detail)}</div></div><div>${fmtDate(x.date)}</div></div>`).join('')}</div>` : empty('Keine Vertrags- oder Prüftermine eingetragen.')}</div>`;
  }

  function tabs(section, items) {
    return `<div class="section-tabs">${items.map(([key,label]) => `<button class="chip ${activeTab[section]===key?'active':''}" data-section="${section}" data-tab="${key}">${esc(label)}</button>`).join('')}</div>`;
  }

  function renderOrganize() {
    const tab = activeTab.organize;
    $('#view-organize').innerHTML = `<div class="view-head"><div><h1>Listen & Inventar</h1><p>Gemeinsam organisieren und abhaken.</p></div></div>
      ${tabs('organize', [['shopping','Einkäufe'],['tasks','Aufgaben'],['inventory','Inventar']])}
      <div id="organizeBody">${tab==='shopping'?renderShopping():tab==='tasks'?renderTasks():renderInventory()}</div>`;
  }

  function renderShopping() {
    const rows = [...state.shopping].sort((a,b)=>Number(a.done)-Number(b.done));
    return `<div class="toolbar"><button class="btn" data-add="shopping">＋ Einkauf hinzufügen</button></div>
      ${rows.length ? `<div class="list">${rows.map(x => `<div class="row ${x.done?'done':''}"><input type="checkbox" data-toggle-shopping="${x.id}" ${x.done?'checked':''}><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.quantity||'')} ${x.category?`· ${esc(x.category)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="shopping" data-id="${x.id}">✎</button><button class="mini danger" data-del="shopping" data-id="${x.id}">×</button></div></div>`).join('')}</div>` : empty('Noch keine Einkäufe eingetragen.')}`;
  }

  function renderTasks() {
    const rows = [...state.tasks].sort((a,b)=>Number(a.done)-Number(b.done) || String(a.due||'9999').localeCompare(String(b.due||'9999')));
    return `<div class="toolbar"><button class="btn" data-add="task">＋ Aufgabe hinzufügen</button></div>
      ${rows.length ? `<div class="list">${rows.map(x => `<div class="row ${x.done?'done':''}"><input type="checkbox" data-toggle-task="${x.id}" ${x.done?'checked':''}><div class="row-main"><div class="row-title">${esc(x.title)}</div><div class="row-sub">${x.member?esc(x.member):'Niemand zugewiesen'}${x.due?` · ${fmtDate(x.due)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="task" data-id="${x.id}">✎</button><button class="mini danger" data-del="task" data-id="${x.id}">×</button></div></div>`).join('')}</div>` : empty('Noch keine Aufgaben eingetragen.')}`;
  }

  function renderInventory() {
    const rows = [...state.inventory].sort((a,b)=>String(a.name).localeCompare(String(b.name),'de'));
    return `<div class="toolbar"><button class="btn" data-add="inventory">＋ Gegenstand hinzufügen</button></div>
      ${rows.length ? `<div class="list">${rows.map(x => `<div class="row"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.location?`Ort: ${esc(x.location)}`:''}${x.quantity?` · Menge: ${esc(x.quantity)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="inventory" data-id="${x.id}">✎</button><button class="mini danger" data-del="inventory" data-id="${x.id}">×</button></div></div>`).join('')}</div>` : empty('Noch kein Inventar erfasst.')}`;
  }

  function renderCosts() {
    const tab = activeTab.costs;
    $('#view-costs').innerHTML = `<div class="view-head"><div><h1>Kosten & Verbrauch</h1><p>Campingkosten ohne Lebensmittel und Ausflüge.</p></div></div>
      ${tabs('costs', [['overview','Übersicht'],['costs','Kosten'],['petroleum','Petroleum'],['electricity','Strom']])}
      <div>${tab==='overview'?renderCostOverview():tab==='costs'?renderCostRows():tab==='petroleum'?renderPetroleum():renderElectricity()}</div>`;
  }

  function renderCostOverview() {
    const years = collectYears();
    const y = years[0] || yearNow();
    const d = currentYearCostData(y); const total = Object.values(d).reduce((a,b)=>a+b,0) || 1;
    const labels = {annual:'Jahresgebühr',electricity:'Strom',petroleum:'Petroleum',repairs:'Reparaturen',purchases:'Neuanschaffungen',other:'Sonstiges'};
    return `<div class="grid"><div class="card half"><h2>Gesamtkosten ${y}</h2><div class="metric">${money(total === 1 && Object.values(d).every(v=>v===0) ? 0 : total)}</div><p>inkl. Strom und Petroleum</p></div><div class="card half"><h2>Jahre</h2><p>${years.length ? years.join(' · ') : 'Noch keine Werte'}</p></div><div class="card full"><h2>Aufteilung ${y}</h2><div class="cost-bars">${Object.entries(d).map(([k,v])=>`<div class="cost-line"><span>${labels[k]}</span><div class="bar"><i style="width:${Math.min(100,(v/(total||1))*100)}%"></i></div><strong class="right">${money(v)}</strong></div>`).join('')}</div></div></div>`;
  }

  function collectYears() {
    const ys = new Set([yearNow()]);
    state.costs.forEach(x=>ys.add(Number(x.year)||yearNow()));
    state.electricity.forEach(x=>ys.add(Number(x.year)||yearNow()));
    state.petroleum.forEach(x=>x.date && ys.add(Number(x.date.slice(0,4))));
    return [...ys].filter(Boolean).sort((a,b)=>b-a);
  }

  function renderCostRows() {
    const labels = {annual:'Jahresgebühr',repairs:'Reparatur',purchases:'Neuanschaffung',other:'Sonstiges'};
    const rows = [...state.costs].sort((a,b)=>Number(b.year)-Number(a.year));
    return `<div class="toolbar"><button class="btn" data-add="cost">＋ Kosten hinzufügen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${esc(labels[x.category]||x.category)} · ${esc(x.year)}</div><div class="row-sub">${esc(x.note||'')}</div></div><strong>${money(x.amount)}</strong><div class="row-actions"><button class="mini" data-edit="cost" data-id="${x.id}">✎</button><button class="mini danger" data-del="cost" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Kosten eingetragen.')}`;
  }

  function renderPetroleum() {
    const rows=[...state.petroleum].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<div class="grid"><div class="card half"><h2>Aktueller Bestand</h2><div class="metric">${num(petroleumStock(),1)} <small>Liter</small></div></div><div class="card half"><h2>Einträge</h2><div class="metric">${rows.length}</div></div></div><div class="toolbar"><button class="btn" data-add="petroleum">＋ Petroleum buchen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${x.kind==='purchase'?'Einkauf':'Verbrauch'} · ${num(x.liters,1)} L</div><div class="row-sub">${fmtDate(x.date)}${x.note?` · ${esc(x.note)}`:''}</div></div>${x.kind==='purchase'?`<strong>${money(x.price)}</strong>`:''}<div class="row-actions"><button class="mini" data-edit="petroleum" data-id="${x.id}">✎</button><button class="mini danger" data-del="petroleum" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Petroleum-Einträge.')}`;
  }

  function renderElectricity() {
    const rows=[...state.electricity].sort((a,b)=>Number(b.year)-Number(a.year));
    return `<div class="toolbar"><button class="btn" data-add="electricity">＋ Jahreswert hinzufügen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${esc(x.year)} · ${num(x.consumption,1)} kWh</div><div class="row-sub">Strom ${money(x.cost)} · Zählermiete ${money(x.meterRent)}</div></div><strong>${money(n(x.cost)+n(x.meterRent))}</strong><div class="row-actions"><button class="mini" data-edit="electricity" data-id="${x.id}">✎</button><button class="mini danger" data-del="electricity" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Jahreswerte eingetragen.')}`;
  }

  function renderCare() {
    const tab=activeTab.care;
    $('#view-care').innerHTML=`<div class="view-head"><div><h1>Rasen & Hecke</h1><p>Nur die Pflege, die ihr wirklich braucht.</p></div></div>${tabs('care',[['lawn','Rasen'],['hedge','Hecke']])}<div>${tab==='lawn'?renderLawn():renderHedge()}</div>`;
  }

  function renderLawn() {
    const rows=[...state.lawn].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<div class="toolbar"><button class="btn" data-add="lawn">＋ Rasenschnitt eintragen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">Rasen gemäht</div><div class="row-sub">${fmtDate(x.date)}${x.note?` · ${esc(x.note)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="lawn" data-id="${x.id}">✎</button><button class="mini danger" data-del="lawn" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch kein Rasenschnitt eingetragen.')}`;
  }

  function renderHedge() {
    const y=yearNow(); const yearRows=state.hedge.filter(x=>Number((x.date||'').slice(0,4))===y).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const rows=[...state.hedge].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<div class="grid"><div class="card half"><h2>Heckenschnitt ${y}</h2><div class="metric">${yearRows.length}<small> / 2</small></div><p>${yearRows.length>=2?'Beide Termine erfasst':'Noch '+(2-yearRows.length)+' Termin(e) offen'}</p></div><div class="card half"><h2>Letzter Schnitt</h2><div class="metric" style="font-size:22px">${rows[0]?fmtDate(rows[0].date):'–'}</div></div></div><div class="toolbar"><button class="btn" data-add="hedge">＋ Heckenschnitt eintragen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">Hecke geschnitten</div><div class="row-sub">${fmtDate(x.date)}${x.note?` · ${esc(x.note)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="hedge" data-id="${x.id}">✎</button><button class="mini danger" data-del="hedge" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch kein Heckenschnitt eingetragen.')}`;
  }

  function renderMore() {
    const tab=activeTab.more;
    $('#view-more').innerHTML=`<div class="view-head"><div><h1>Verwaltung</h1><p>Stellplatz, Übernachtungen, Verträge und Prüfungen.</p></div></div>${tabs('more',[['site','Stellplatz'],['stays','Übernachtungen'],['contracts','Verträge'],['gas','Gasprüfung'],['season','Saison']])}<div>${tab==='site'?renderSite():tab==='stays'?renderStays():tab==='contracts'?renderContracts():tab==='gas'?renderGas():renderSeason()}</div>`;
  }

  function renderSite() {
    return `<div class="grid"><div class="card half"><h2>Stellplatz</h2><div class="metric">${esc(state.site.pitch||'161')}</div><p>${esc(state.site.campName||'Campingplatz')}</p>${state.site.area?`<p>${esc(state.site.area)} m²</p>`:''}<div class="toolbar"><button class="btn secondary" data-open="site">Bearbeiten</button></div></div><div class="card half"><h2>Nächste Anreise</h2><div class="metric" style="font-size:22px">${state.nextArrival?fmtDate(state.nextArrival):'–'}</div><div class="toolbar"><button class="btn secondary" data-open="arrival">Planen</button></div></div><div class="card full"><h2>Familie</h2><div class="list">${state.family.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.role||'')}</div></div><div class="row-actions"><button class="mini" data-edit="family" data-id="${x.id}">✎</button><button class="mini danger" data-del="family" data-id="${x.id}">×</button></div></div>`).join('')}</div><div class="toolbar"><button class="btn secondary" data-add="family">＋ Person</button></div></div></div>`;
  }

  function renderStays() {
    const rows=[...state.stays].sort((a,b)=>String(b.arrival).localeCompare(String(a.arrival)));
    return `<div class="grid"><div class="card half"><h2>Dieses Jahr</h2><div class="metric">${totalNights(yearNow())}</div><p>Übernachtungen ${yearNow()}</p></div><div class="card half"><h2>Gesamt</h2><div class="metric">${totalNights()}</div><p>Übernachtungen</p></div></div><div class="toolbar"><button class="btn" data-add="stay">＋ Aufenthalt hinzufügen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${fmtDate(x.arrival)} – ${fmtDate(x.departure)}</div><div class="row-sub">${daysBetween(x.arrival,x.departure)} Übernachtungen${x.people?` · ${esc(x.people)}`:''}</div></div><div class="row-actions"><button class="mini" data-edit="stay" data-id="${x.id}">✎</button><button class="mini danger" data-del="stay" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Aufenthalte eingetragen.')}`;
  }

  function renderContracts() {
    const rows=[...state.contracts].sort((a,b)=>String(a.noticeDate||a.endDate||'9999').localeCompare(String(b.noticeDate||b.endDate||'9999')));
    return `<div class="toolbar"><button class="btn" data-add="contract">＋ Vertrag hinzufügen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.startDate?`Beginn ${fmtDate(x.startDate)}`:''}${x.noticeDate?` · Frist ${fmtDate(x.noticeDate)}`:''}${x.endDate?` · Ende ${fmtDate(x.endDate)}`:''}${x.annualCost?` · ${money(x.annualCost)}/Jahr`:''}</div>${x.documentPath?`<div class="row-sub">Dokument hinterlegt</div>`:''}</div><div class="row-actions">${x.documentPath?`<button class="mini" data-doc="contract" data-id="${x.id}">PDF</button>`:''}<button class="mini" data-edit="contract" data-id="${x.id}">✎</button><button class="mini danger" data-del="contract" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Verträge eingetragen.')}`;
  }

  function renderGas() {
    const rows=[...state.gasChecks].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<div class="toolbar"><button class="btn" data-add="gas">＋ Gasprüfung hinzufügen</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="row"><div class="row-main"><div class="row-title">Prüfung ${fmtDate(x.date)} · ${esc(x.result||'')}</div><div class="row-sub">Nächste Prüfung: ${fmtDate(x.nextDue)}${x.company?` · ${esc(x.company)}`:''}${x.cost?` · ${money(x.cost)}`:''}</div>${x.defects?`<div class="row-sub">Mängel: ${esc(x.defects)}</div>`:''}${x.documentPath?`<div class="row-sub">Bescheinigung hinterlegt</div>`:''}</div><div class="row-actions">${x.documentPath?`<button class="mini" data-doc="gas" data-id="${x.id}">PDF</button>`:''}<button class="mini" data-edit="gas" data-id="${x.id}">✎</button><button class="mini danger" data-del="gas" data-id="${x.id}">×</button></div></div>`).join('')}</div>`:empty('Noch keine Gasprüfung eingetragen.')}`;
  }

  function renderSeason() {
    const block=(title,key)=>`<div class="card half"><h2>${title}</h2><div class="list">${state[key].map(x=>`<div class="row ${x.done?'done':''}"><input type="checkbox" data-checklist="${key}" data-id="${x.id}" ${x.done?'checked':''}><div class="row-main"><div class="row-title">${esc(x.text)}</div></div><button class="mini danger" data-delcheck="${key}" data-id="${x.id}">×</button></div>`).join('')}</div><div class="toolbar"><button class="btn secondary" data-addcheck="${key}">＋ Punkt</button><button class="btn secondary" data-resetcheck="${key}">Zurücksetzen</button></div></div>`;
    return `<div class="grid">${block('Saisonstart','seasonStart')}${block('Winterfest','winter')}</div>`;
  }

  function renderAll() {
    renderTop(); renderDashboard(); renderOrganize(); renderCosts(); renderCare(); renderMore(); showView(activeView);
  }

  function showView(v) {
    activeView=v;
    $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${v}`));
    $$('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.view===v));
    window.scrollTo({top:0,behavior:'instant'});
  }

  function modal(title, body, actions='') {
    $('#modalTitle').textContent=title;
    $('#modalBody').innerHTML=body;
    $('#modalActions').innerHTML=actions;
    $('#modal').showModal();
  }
  function closeModal(){ $('#modal').close(); }
  const field=(label,name,value='',type='text',extra='')=>`<div class="field"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value??'')}" ${extra}></div>`;
  const area=(label,name,value='')=>`<div class="field full"><label>${esc(label)}</label><textarea name="${name}">${esc(value??'')}</textarea></div>`;
  const select=(label,name,value,opts)=>`<div class="field"><label>${esc(label)}</label><select name="${name}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;
  const saveActions=()=>`<button value="cancel" class="btn secondary">Abbrechen</button><button type="button" class="btn" data-modal-save>Speichern</button>`;

  function familyOptions(){ return [['','Nicht zugewiesen'],...state.family.map(x=>[x.name,x.name])]; }

  function openEditor(type, existing=null) {
    const x=existing||{};
    let body='', title='Eintrag';
    if(type==='shopping'){ title=existing?'Einkauf bearbeiten':'Einkauf hinzufügen'; body=`<div class="form-grid">${field('Artikel','name',x.name,'text','required')}${field('Menge','quantity',x.quantity)}${field('Kategorie','category',x.category)}</div>`; }
    if(type==='task'){ title=existing?'Aufgabe bearbeiten':'Aufgabe hinzufügen'; body=`<div class="form-grid">${field('Aufgabe','title',x.title,'text','required')}${select('Zuweisen an','member',x.member||'',familyOptions())}${field('Fällig am','due',x.due,'date')}${area('Notiz','note',x.note)}</div>`; }
    if(type==='inventory'){ title=existing?'Inventar bearbeiten':'Gegenstand hinzufügen'; body=`<div class="form-grid">${field('Gegenstand','name',x.name,'text','required')}${field('Menge','quantity',x.quantity)}${field('Lagerort / Kiste','location',x.location)}${area('Notiz','note',x.note)}</div>`; }
    if(type==='cost'){ title=existing?'Kosten bearbeiten':'Kosten hinzufügen'; body=`<div class="form-grid">${select('Kategorie','category',x.category||'annual',[['annual','Jahresgebühr'],['repairs','Reparatur'],['purchases','Neuanschaffung'],['other','Sonstiges']])}${field('Jahr','year',x.year||yearNow(),'number','min="2000" max="2200"')}${field('Betrag €','amount',x.amount,'number','step="0.01" min="0"')}${area('Notiz','note',x.note)}</div>`; }
    if(type==='petroleum'){ title=existing?'Petroleum bearbeiten':'Petroleum buchen'; body=`<div class="form-grid">${select('Art','kind',x.kind||'purchase',[['purchase','Einkauf'],['usage','Verbrauch']])}${field('Datum','date',x.date||today(),'date','required')}${field('Liter','liters',x.liters,'number','step="0.1" min="0" required')}${field('Preis gesamt € (nur Einkauf)','price',x.price,'number','step="0.01" min="0"')}${area('Notiz','note',x.note)}</div>`; }
    if(type==='electricity'){ title=existing?'Stromwert bearbeiten':'Strom-Jahreswert'; body=`<div class="form-grid">${field('Jahr','year',x.year||yearNow(),'number','required min="2000" max="2200"')}${field('Verbrauch kWh','consumption',x.consumption,'number','step="0.1" min="0"')}${field('Stromkosten €','cost',x.cost,'number','step="0.01" min="0"')}${field('Zählermiete €','meterRent',x.meterRent,'number','step="0.01" min="0"')}</div>`; }
    if(type==='lawn' || type==='hedge'){ title=type==='lawn'?(existing?'Rasenschnitt bearbeiten':'Rasenschnitt eintragen'):(existing?'Heckenschnitt bearbeiten':'Heckenschnitt eintragen'); body=`<div class="form-grid">${field('Datum','date',x.date||today(),'date','required')}${area('Notiz','note',x.note)}</div>`; }
    if(type==='stay'){ title=existing?'Aufenthalt bearbeiten':'Aufenthalt hinzufügen'; body=`<div class="form-grid">${field('Anreise','arrival',x.arrival||today(),'date','required')}${field('Abreise','departure',x.departure||'','date','required')}${field('Personen / Notiz','people',x.people)}${area('Notiz','note',x.note)}</div>`; }
    if(type==='family'){ title=existing?'Person bearbeiten':'Person hinzufügen'; body=`<div class="form-grid">${field('Name','name',x.name,'text','required')}${field('Rolle','role',x.role)}</div>`; }
    if(type==='contract'){ title=existing?'Vertrag bearbeiten':'Vertrag hinzufügen'; body=`<div class="form-grid">${field('Vertrag / Anbieter','name',x.name,'text','required')}${field('Vertragsbeginn','startDate',x.startDate,'date')}${field('Vertragsende','endDate',x.endDate,'date')}${field('Kündigungs-/Prüffrist','noticeDate',x.noticeDate,'date')}${field('Kosten pro Jahr €','annualCost',x.annualCost,'number','step="0.01" min="0"')}${field('Ansprechpartner','contact',x.contact)}${area('Notiz','note',x.note)}<div class="field full"><label>Vertrag als PDF / Foto</label><input name="document" type="file" accept="application/pdf,image/*"><div class="small-note">Datei-Upload funktioniert im Cloud-Modus. Vorhandenes Dokument bleibt erhalten, wenn keine neue Datei gewählt wird.</div></div></div>`; }
    if(type==='gas'){ title=existing?'Gasprüfung bearbeiten':'Gasprüfung hinzufügen'; body=`<div class="form-grid">${field('Prüfdatum','date',x.date||today(),'date','required')}${field('Nächste Prüfung','nextDue',x.nextDue,'date')}${select('Ergebnis','result',x.result||'bestanden',[['bestanden','Bestanden'],['maengel','Mängel'],['offen','Offen']])}${field('Prüfer / Firma','company',x.company)}${field('Prüfnummer','certificateNo',x.certificateNo)}${field('Kosten €','cost',x.cost,'number','step="0.01" min="0"')}${area('Mängel','defects',x.defects)}${field('Mängel beseitigt am','fixedDate',x.fixedDate,'date')}<div class="field full"><label>Prüfbescheinigung PDF / Foto</label><input name="document" type="file" accept="application/pdf,image/*"><div class="small-note">Datei-Upload funktioniert im Cloud-Modus.</div></div></div>`; }
    modal(title, `<form id="editForm">${body}</form>`, saveActions());
    $('[data-modal-save]').onclick = () => saveEditor(type, existing?.id || null);
  }

  async function uploadDocument(file, folder) {
    if (!file) return null;
    if (!session || !sb || localStorage.getItem(MODE_KEY)==='local') {
      toast('Dokumente können nur im Cloud-Modus gespeichert werden');
      return null;
    }
    const ext=(file.name.split('.').pop()||'bin').replace(/[^a-zA-Z0-9]/g,'');
    const path=`${session.user.id}/${folder}/${Date.now()}-${id()}.${ext}`;
    const {error}=await sb.storage.from('documents').upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(error) throw error;
    return path;
  }

  async function saveEditor(type, existingId) {
    const f=$('#editForm'); if(!f.reportValidity()) return;
    const fd=new FormData(f); const obj=Object.fromEntries([...fd.entries()].filter(([k])=>k!=='document'));
    const map={shopping:'shopping',task:'tasks',inventory:'inventory',cost:'costs',petroleum:'petroleum',electricity:'electricity',lawn:'lawn',hedge:'hedge',stay:'stays',family:'family',contract:'contracts',gas:'gasChecks'};
    const arr=state[map[type]];
    const old=existingId?arr.find(r=>r.id===existingId):null;
    let item={...(old||{}), ...obj, id:existingId||id()};
    if(type==='shopping') item.done=old?.done||false;
    if(type==='task') item.done=old?.done||false;
    try {
      if(type==='contract'||type==='gas') {
        const file=fd.get('document');
        if(file && file.size) {
          const path=await uploadDocument(file,type==='contract'?'contracts':'gas');
          if(path) item.documentPath=path;
        }
      }
      if(type==='hedge' && !existingId) {
        const y=(item.date||'').slice(0,4);
        if(y && state.hedge.filter(r => (r.date||'').slice(0,4)===y).length >= 2) {
          toast(`Für ${y} sind bereits 2 Heckenschnitte eingetragen`);
          return;
        }
      }
      if(existingId) Object.assign(old,item); else arr.push(item);
      closeModal(); await saveState(); renderAll(); toast('Gespeichert');
    } catch(e) { console.error(e); toast('Speichern fehlgeschlagen'); }
  }

  function openSite(){
    const x=state.site; modal('Stellplatz bearbeiten',`<form id="editForm"><div class="form-grid">${field('Campingplatz','campName',x.campName)}${field('Stellplatznummer','pitch',x.pitch)}${field('Fläche m²','area',x.area,'number','step="0.1" min="0"')}${area('Notizen','notes',x.notes)}</div></form>`,saveActions());
    $('[data-modal-save]').onclick=()=>{ const f=$('#editForm'); const d=Object.fromEntries(new FormData(f)); state.site={...state.site,...d}; closeModal(); saveState(); renderAll(); };
  }

  function openArrival(){
    modal('Nächste Anreise',`<form id="editForm"><div class="form-grid">${field('Datum','date',state.nextArrival,'date')}</div></form>`,saveActions());
    $('[data-modal-save]').onclick=()=>{state.nextArrival=new FormData($('#editForm')).get('date')||'';closeModal();saveState();renderAll();};
  }

  function openChecklistAdd(key){
    modal('Checklistenpunkt',`<form id="editForm"><div class="form-grid">${field('Text','text','','text','required')}</div></form>`,saveActions());
    $('[data-modal-save]').onclick=()=>{const f=$('#editForm');if(!f.reportValidity())return;state[key].push({id:id(),text:new FormData(f).get('text'),done:false});closeModal();saveState();renderAll();};
  }

  async function openDocument(type,itemId){
    if(!session||!sb){toast('Cloud-Anmeldung erforderlich');return;}
    const arr=type==='contract'?state.contracts:state.gasChecks; const x=arr.find(r=>r.id===itemId); if(!x?.documentPath)return;
    const {data,error}=await sb.storage.from('documents').createSignedUrl(x.documentPath,120);
    if(error||!data?.signedUrl){toast('Dokument konnte nicht geöffnet werden');return;}
    window.open(data.signedUrl,'_blank','noopener');
  }

  async function removeItem(type,itemId){
    const map={shopping:'shopping',task:'tasks',inventory:'inventory',cost:'costs',petroleum:'petroleum',electricity:'electricity',lawn:'lawn',hedge:'hedge',stay:'stays',family:'family',contract:'contracts',gas:'gasChecks'};
    const arr=state[map[type]]; const ix=arr.findIndex(x=>x.id===itemId); if(ix<0)return;
    if(!confirm('Eintrag wirklich löschen?'))return;
    const [old]=arr.splice(ix,1);
    if((type==='contract'||type==='gas')&&old.documentPath&&sb&&session){ try{await sb.storage.from('documents').remove([old.documentPath]);}catch{} }
    saveState();renderAll();
  }

  function editItem(type,itemId){
    const map={shopping:'shopping',task:'tasks',inventory:'inventory',cost:'costs',petroleum:'petroleum',electricity:'electricity',lawn:'lawn',hedge:'hedge',stay:'stays',family:'family',contract:'contracts',gas:'gasChecks'};
    const item=state[map[type]].find(x=>x.id===itemId); if(item)openEditor(type,item);
  }

  function bindEvents(){
    document.addEventListener('click', e=>{
      const go=e.target.closest('[data-go]'); if(go){ const v=go.dataset.go; if(go.dataset.tab)activeTab[v]=go.dataset.tab; renderAll(); showView(v); return; }
      const nav=e.target.closest('[data-view]'); if(nav){ showView(nav.dataset.view); return; }
      const tab=e.target.closest('[data-section][data-tab]'); if(tab){activeTab[tab.dataset.section]=tab.dataset.tab;renderAll();showView(tab.dataset.section);return;}
      const add=e.target.closest('[data-add]'); if(add){openEditor(add.dataset.add);return;}
      const edit=e.target.closest('[data-edit]'); if(edit){editItem(edit.dataset.edit,edit.dataset.id);return;}
      const del=e.target.closest('[data-del]'); if(del){removeItem(del.dataset.del,del.dataset.id);return;}
      const open=e.target.closest('[data-open]'); if(open){ if(open.dataset.open==='site')openSite(); if(open.dataset.open==='arrival')openArrival(); return; }
      const addc=e.target.closest('[data-addcheck]'); if(addc){openChecklistAdd(addc.dataset.addcheck);return;}
      const delc=e.target.closest('[data-delcheck]'); if(delc){ const a=state[delc.dataset.delcheck]; const i=a.findIndex(x=>x.id===delc.dataset.id); if(i>=0){a.splice(i,1);saveState();renderAll();}return;}
      const reset=e.target.closest('[data-resetcheck]'); if(reset){state[reset.dataset.resetcheck].forEach(x=>x.done=false);saveState();renderAll();return;}
      const doc=e.target.closest('[data-doc]'); if(doc){openDocument(doc.dataset.doc,doc.dataset.id);return;}
    });
    document.addEventListener('change',e=>{
      if(e.target.matches('[data-toggle-shopping]')){const x=state.shopping.find(r=>r.id===e.target.dataset.toggleShopping);if(x){x.done=e.target.checked;saveState();renderAll();}}
      if(e.target.matches('[data-toggle-task]')){const x=state.tasks.find(r=>r.id===e.target.dataset.toggleTask);if(x){x.done=e.target.checked;saveState();renderAll();}}
      if(e.target.matches('[data-checklist]')){const x=state[e.target.dataset.checklist].find(r=>r.id===e.target.dataset.id);if(x){x.done=e.target.checked;saveState();renderAll();}}
    });
    $('#accountBtn').addEventListener('click',openAccount);
    $('.brand').addEventListener('click',()=>showView('dashboard'));
  }

  function accountPanel(){
    const cloud = !!session && localStorage.getItem(MODE_KEY)!=='local';
    return `<div class="form-grid"><div class="field full"><label>Modus</label><div class="notice">${cloud?`Cloud-Synchronisierung aktiv<br><strong>${esc(session.user.email||'')}</strong>`:'Lokaler Modus – Daten nur auf diesem Gerät'}</div></div></div>
      <div class="toolbar">${cloud?'<button type="button" class="btn secondary" id="logoutBtn">Abmelden</button>':CLOUD_READY?'<button type="button" class="btn" id="switchCloudBtn">Cloud-Anmeldung öffnen</button>':''}<button type="button" class="btn secondary" id="exportBtn">Daten exportieren</button><label class="btn secondary" style="display:inline-block">Daten importieren<input id="importFile" type="file" accept="application/json" hidden></label></div>
      <p class="small-note">Für die gemeinsame Nutzung auf mehreren Geräten muss die Cloud-Synchronisierung eingerichtet und auf allen Geräten dasselbe Familienkonto verwendet werden.</p>`;
  }

  function openAccount(){
    modal('Konto & Daten',accountPanel(),'<button value="cancel" class="btn secondary">Schließen</button>');
    $('#logoutBtn')?.addEventListener('click',async()=>{await sb.auth.signOut();session=null;cloudRecordId=null;localStorage.removeItem(MODE_KEY);closeModal();showGate();});
    $('#switchCloudBtn')?.addEventListener('click',()=>{closeModal();localStorage.removeItem(MODE_KEY);showGate();});
    $('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`platz161-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
    $('#importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{state=normalize(JSON.parse(await file.text()));await saveState({immediate:true});renderAll();closeModal();toast('Backup importiert');}catch{toast('Ungültige Backup-Datei');}});
  }

  async function initCloud(){
    if(!CLOUD_READY)return false;
    sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await sb.auth.getSession(); session=data.session;
    sb.auth.onAuthStateChange(async(_event,s)=>{session=s;if(session&&localStorage.getItem(MODE_KEY)!=='local'){try{await loadCloud();renderAll();}catch(e){console.error(e);}}});
    return true;
  }

  function showGate(){
    const g=$('#setupGate'); g.classList.remove('hidden');
    if(!CLOUD_READY){
      g.innerHTML=`<div class="gate-card"><img class="gate-logo" src="assets/logo.jpg" alt="Logo"><h1>CampManager Platz 161</h1><p>Die App ist fertig vorbereitet. Für gemeinsame Daten auf mehreren Geräten muss einmal die kostenlose Cloud-Synchronisierung in <code>config.js</code> eingerichtet werden.</p><div class="notice"><strong>Aktuell:</strong> Cloud-Zugang ist noch nicht eingetragen. Du kannst die App bereits lokal testen; diese Daten bleiben aber nur auf diesem Gerät.</div><button class="btn block" id="localBtn">Lokal testen</button><p class="small-note">Die Anleitung steht in README.md und supabase.sql.</p></div>`;
      $('#localBtn').onclick=()=>{localStorage.setItem(MODE_KEY,'local');g.classList.add('hidden');setSyncBadge('local','Lokal');renderAll();};
      return;
    }
    if(session && localStorage.getItem(MODE_KEY)!=='local'){
      g.classList.add('hidden'); loadCloud().then(renderAll).catch(e=>{console.error(e);toast('Cloud konnte nicht geladen werden');}); return;
    }
    g.innerHTML=`<div class="gate-card"><img class="gate-logo" src="assets/logo.jpg" alt="Logo"><h1>Familienkonto</h1><p>Auf allen Geräten mit derselben E-Mail und demselben Passwort anmelden. Dann werden die Daten synchron gehalten.</p><div class="switch"><button class="btn" id="loginTab">Anmelden</button><button class="btn secondary" id="registerTab">Konto erstellen</button></div><form id="authForm"><div class="form-grid"><div class="field full"><label>E-Mail</label><input name="email" type="email" required autocomplete="email"></div><div class="field full"><label>Passwort</label><input name="password" type="password" minlength="6" required autocomplete="current-password"></div></div><button class="btn block" style="margin-top:14px" id="authSubmit">Anmelden</button></form><div class="toolbar"><button class="btn secondary block" id="localBtn">Nur auf diesem Gerät nutzen</button></div><p id="authMessage" class="small-note"></p></div>`;
    let mode='login';
    const setMode=m=>{mode=m;$('#loginTab').className=`btn ${m==='login'?'':'secondary'}`;$('#registerTab').className=`btn ${m==='register'?'':'secondary'}`;$('#authSubmit').textContent=m==='login'?'Anmelden':'Konto erstellen';$('input[name=password]').autocomplete=m==='login'?'current-password':'new-password';};
    $('#loginTab').onclick=()=>setMode('login'); $('#registerTab').onclick=()=>setMode('register');
    $('#localBtn').onclick=()=>{localStorage.setItem(MODE_KEY,'local');g.classList.add('hidden');setSyncBadge('local','Lokal');renderAll();};
    $('#authForm').onsubmit=async e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget); const email=fd.get('email'); const password=fd.get('password'); const msg=$('#authMessage'); msg.textContent='Bitte warten…';
      try{
        let res;
        if(mode==='register') res=await sb.auth.signUp({email,password}); else res=await sb.auth.signInWithPassword({email,password});
        if(res.error)throw res.error;
        session=res.data.session;
        if(mode==='register'&&!session){msg.textContent='Konto erstellt. Falls E-Mail-Bestätigung aktiviert ist, bestätige zuerst die E-Mail und melde dich danach an.';return;}
        localStorage.setItem(MODE_KEY,'cloud');g.classList.add('hidden');await loadCloud();renderAll();
      }catch(err){msg.textContent=err.message||'Anmeldung fehlgeschlagen.';}
    };
  }

  function setupInstall(){
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').classList.remove('hidden');});
    $('#installBtn').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').classList.add('hidden');}else{toast('Auf iPhone: Teilen → Zum Home-Bildschirm');}};
    if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
  }

  async function boot(){
    bindEvents(); setupInstall(); await initCloud(); renderAll();
    if(localStorage.getItem(MODE_KEY)==='local'){setSyncBadge('local','Lokal');$('#setupGate').classList.add('hidden');}
    else showGate();
  }

  boot();
})();
