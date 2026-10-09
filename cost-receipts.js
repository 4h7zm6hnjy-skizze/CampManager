'use strict';
/* CampManager v63 add-on
   FIX:
   - Jahresabschluss öffnet wieder mit der originalen CampManager-Funktion.
   - Frage nach Rechnungen/Dokumenten erst beim PDF-Speichern.
   - Rechnungen/Belege werden direkt gespeichert, ohne Versicherungs-Umweg.
   - Upload sichtbar in Kosten-Übersicht und in allen Kosten-Unterbereichen.
*/
(() => {
  if (window.__campmanagerV63Installed) return;
  window.__campmanagerV63Installed = true;

  const SECTION_LABELS = {
    annualRent:'Jahresmiete / Jahresbeitrag',
    deposit:'Kaution',
    insurance:'Versicherung',
    taxes:'Steuer',
    installments:'Ratenzahlung',
    electricity:'Strom / Zählermiete',
    travel:'Hin- & Rückfahrten',
    repairs:'Reparaturen',
    purchases:'Neuanschaffungen',
    other:'Sonstiges',
    petroleum:'Petroleum',
    gasbottles:'Gas / Gasflaschen',
    gascheck:'Gasprüfung',
    contracts:'Verträge'
  };

  const TAB_TO_SECTION = {
    annualRent:'annualRent', deposit:'deposit', insurance:'insurance', taxes:'taxes',
    installments:'installments', electricity:'electricity', travel:'travel',
    petroleum:'petroleum', gasbottles:'gasbottles'
  };

  function E(v){
    try { if (typeof esc === 'function') return esc(v); } catch {}
    return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function F(v){
    try { if (typeof fmt === 'function') return fmt(v); } catch {}
    if(!v)return '–'; const d=new Date(String(v).slice(0,10)+'T12:00:00');
    return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('de-DE');
  }
  function Y(){ try{return String(yearNow())}catch{return String(new Date().getFullYear())} }
  function T(){ try{return today()}catch{return new Date().toISOString().slice(0,10)} }
  function P(){ try{return place()}catch{return null} }

  function receiptDocs(section){
    const p=P(); if(!p)return [];
    return (p.documents||[]).filter(d=>d.category==='cost_receipt'&&d.costSection===section)
      .sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
  }

  function receiptCount(section){ return receiptDocs(section).length; }

  function receiptCards(section){
    const docs=receiptDocs(section);
    if(!docs.length)return '<div class="empty">Noch keine Rechnung / kein Beleg gespeichert.</div>';
    return `<div class="docgrid">${docs.map(d=>`<div class="doc">
      <div class="docthumb" data-docopen="${E(d.id)}">${String(d.mime||'').startsWith('image/')?'🧾':'📄'}</div>
      <div class="rowtitle" style="margin-top:8px">${E(d.title||d.filename||'Rechnung / Beleg')}</div>
      <div class="rowsub">${F(d.date)}${d.year?' · '+E(d.year):''}</div>
      ${d.note?`<div class="rowsub">${E(d.note)}</div>`:''}
      <div class="toolbar"><button class="mini" type="button" data-docopen="${E(d.id)}">Öffnen</button><button class="mini" type="button" data-costreceipt-edit="${E(d.id)}">✎</button><button class="mini danger" type="button" data-costreceipt-del="${E(d.id)}">×</button></div>
    </div>`).join('')}</div>`;
  }

  function receiptBlock(section){
    const label=SECTION_LABELS[section]; if(!label)return '';
    return `<div class="divider"></div><div class="card full cm-cost-receipts" data-cm-receipts="${E(section)}">
      <h2>🧾 Rechnungen & Belege – ${E(label)}</h2>
      <div class="rowsub">${receiptCount(section)} Beleg(e) gespeichert</div>
      <div class="toolbar">
        <button class="btn" type="button" data-costreceipt-camera="${E(section)}">📷 Foto aufnehmen</button>
        <button class="btn sec" type="button" data-costreceipt-library="${E(section)}">🖼️ Aus Mediathek</button>
        <button class="btn sec" type="button" data-costreceipt-file="${E(section)}">📁 Datei / PDF</button>
      </div>${receiptCards(section)}</div>`;
  }

  function overviewMap(){
    return ['annualRent','deposit','insurance','taxes','installments','repairs','purchases','other','electricity','travel','petroleum','gasbottles','gascheck','contracts'];
  }

  function injectOverviewButtons(host){
    const cards=[...host.querySelectorAll('.costdetail')];
    overviewMap().forEach((section,i)=>{
      const card=cards[i]; if(!card||card.querySelector('[data-costreceipt-overview]'))return;
      const wrap=document.createElement('div'); wrap.className='toolbar'; wrap.style.marginTop='10px'; wrap.dataset.costreceiptOverview=section;
      wrap.innerHTML=`<button class="mini" type="button" data-costreceipt-camera="${E(section)}">📷 Rechnung</button><button class="mini" type="button" data-costreceipt-library="${E(section)}">🖼️ Mediathek</button><span class="costpill">${receiptCount(section)} Beleg(e)</span>`;
      card.appendChild(wrap);
    });
  }

  function injectReceiptUI(){
    const host=document.querySelector('#v-costs'); if(!host)return;
    let active=''; try{active=tab?.costs||''}catch{}
    host.querySelectorAll('.cm-cost-receipts').forEach(n=>n.remove());
    if(active==='overview'){
      injectOverviewButtons(host); return;
    }
    if(active==='costs'){
      host.insertAdjacentHTML('beforeend',`<div class="notice"><b>Rechnungen & Belege:</b> Die drei manuellen Kostenarten werden getrennt gespeichert.</div>${receiptBlock('repairs')}${receiptBlock('purchases')}${receiptBlock('other')}`);
      return;
    }
    const section=TAB_TO_SECTION[active] || '';
    if(section)host.insertAdjacentHTML('beforeend',receiptBlock(section));
  }

  async function saveReceiptFile(file,section){
    const p=P(),label=SECTION_LABELS[section]; if(!p||!file||!label)return;
    if(file.size>25*1024*1024){ try{toast('Datei zu groß (max. 25 MB)')}catch{} return; }
    try{
      const id=typeof uid==='function'?uid():(Date.now()+'-'+Math.random().toString(36).slice(2));
      const blob=typeof compress==='function'?await compress(file):file;
      if(typeof dbPut!=='function')throw new Error('Dokumentenspeicher nicht verfügbar');
      await dbPut(id,blob);
      let cloudPath='';
      try{
        if(typeof cloudReady==='function'&&cloudReady()&&typeof session!=='undefined'&&session?.access_token&&typeof uploadDocumentCloud==='function'){
          cloudPath=await uploadDocumentCloud(id,blob);
        }
      }catch(err){ console.warn('Cloud-Beleg',err); }
      const meta={id,category:'cost_receipt',costSection:section,title:label+' – Rechnung / Beleg',date:T(),year:Y(),mime:blob.type||file.type||'application/octet-stream',filename:file.name||'beleg',size:blob.size||file.size||0,cloudPath,createdAt:new Date().toISOString(),note:''};
      p.documents||(p.documents=[]); p.documents.push(meta);
      if(typeof save==='function')save(); else if(typeof persist==='function')persist();
      try{toast('Rechnung / Beleg gespeichert')}catch{}
      if(typeof renderCosts==='function')renderCosts(); setTimeout(injectReceiptUI,0);
    }catch(err){ console.error('Beleg speichern',err); try{toast('Rechnung konnte nicht gespeichert werden')}catch{} }
  }

  function pickReceipt(section,mode){
    if(!SECTION_LABELS[section])return;
    const input=document.createElement('input'); input.type='file'; input.style.display='none';
    input.accept=mode==='file'?'image/*,application/pdf':'image/*';
    if(mode==='camera')input.setAttribute('capture','environment');
    document.body.appendChild(input);
    input.onchange=async()=>{const f=input.files?.[0];input.remove();if(f)await saveReceiptFile(f,section)};
    input.oncancel=()=>input.remove(); input.click();
  }

  function editReceipt(id){
    const p=P(); if(!p)return; const d=(p.documents||[]).find(x=>x.id===id&&x.category==='cost_receipt'); if(!d)return;
    const label=SECTION_LABELS[d.costSection]||'Kosten';
    modal('Rechnung / Beleg bearbeiten',`<form id="cmReceiptEditForm" data-id="${E(id)}"><div class="formgrid">${field('Titel','title',d.title||(label+' – Rechnung / Beleg'),'text','required')}${field('Belegdatum','date',d.date||T(),'date','required')}${field('Jahr','year',d.year||Y(),'number','min="2000"')}${area('Notiz','note',d.note||'')}</div></form>`,actions('cmReceiptEditForm'));
  }

  async function deleteReceipt(id){
    const p=P(); if(!p)return; const d=(p.documents||[]).find(x=>x.id===id&&x.category==='cost_receipt'); if(!d)return;
    if(!confirm('Rechnung / Beleg wirklich löschen?'))return;
    p.documents=(p.documents||[]).filter(x=>x.id!==id);
    try{await dbDel(id)}catch{}
    try{if(d.cloudPath&&typeof deleteDocumentCloud==='function')await deleteDocumentCloud(d.cloudPath)}catch{}
    if(typeof save==='function')save(); else if(typeof persist==='function')persist();
    if(typeof renderCosts==='function')renderCosts(); setTimeout(injectReceiptUI,0); try{toast('Beleg gelöscht')}catch{}
  }

  // ---- Jahresabschluss: Öffnen NICHT abfangen. Original bleibt vollständig aktiv. ----
  let pendingPdfChoice=false;
  function annualDocuments(year){
    const y=String(year||''),p=P(); if(!p)return [];
    return (p.documents||[]).filter(d=>String(d.year||'')===y||String(d.date||'').startsWith(y)||String(d.createdAt||'').startsWith(y))
      .sort((a,b)=>String(a.date||a.createdAt||'').localeCompare(String(b.date||b.createdAt||'')));
  }
  function kind(d){
    try{if(typeof docLabel==='function')return docLabel(d.category)}catch{}
    return d.category==='cost_receipt'?'Rechnung / Beleg':d.category==='insurance'?'Versicherungsdokument':d.category==='insurance_claim'?'Schadenfoto':'Dokument';
  }
  function askPdfChoice(){
    const docs=annualDocuments(typeof closingYear!=='undefined'?closingYear:Y());
    pendingPdfChoice=true;
    modal('Jahresabschluss speichern',`<div class="notice good"><b>Rechnungen & Dokumente</b><br>Sollen alle Rechnungen und Dokumente des gewählten Jahres mit in die PDF aufgenommen werden?</div><div class="card full"><h2>${docs.length} Dokument${docs.length===1?'':'e'} gefunden</h2><p>Bei „Ja“ werden Fotos/Bilder als PDF-Seiten angehängt. Vorhandene PDF-Dateien werden – soweit möglich – mit ihren Seiten übernommen.</p></div>`,`<button class="btn" type="button" data-cm-pdfchoice="yes">Ja – mit Rechnungen & Dokumenten</button><button class="btn sec" type="button" data-cm-pdfchoice="no">Nein – nur Jahresabschluss</button><button class="btn sec" type="button" data-close>Abbrechen</button>`);
  }

  function loadPdfLib(){
    if(window.PDFLib?.PDFDocument)return Promise.resolve(window.PDFLib);
    if(window.__cmPdfLibPromise)return window.__cmPdfLibPromise;
    const urls=['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'];
    window.__cmPdfLibPromise=new Promise((resolve,reject)=>{let i=0;const next=()=>{if(window.PDFLib?.PDFDocument)return resolve(window.PDFLib);if(i>=urls.length)return reject(new Error('PDF-Bibliothek nicht verfügbar'));const s=document.createElement('script');s.src=urls[i++];s.async=true;s.onload=()=>window.PDFLib?.PDFDocument?resolve(window.PDFLib):next();s.onerror=()=>{s.remove();next()};document.head.appendChild(s)};next()}).catch(e=>{window.__cmPdfLibPromise=null;throw e});
    return window.__cmPdfLibPromise;
  }
  async function getBlob(meta){
    let b=null;try{b=await dbGet(meta.id)}catch{}
    if(!b&&meta.cloudPath&&typeof downloadDocumentCloud==='function'){try{b=await downloadDocumentCloud(meta.cloudPath);if(b)await dbPut(meta.id,b).catch(()=>{})}catch(e){console.warn(e)}}
    return b;
  }
  async function imageForPdf(blob){
    const t=String(blob?.type||'').toLowerCase(); if(t.includes('jpeg')||t.includes('jpg')||t.includes('png'))return blob;
    if(!t.startsWith('image/'))return blob;
    const bmp=await createImageBitmap(blob);try{const max=2200,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bmp,0,0,w,h);return await new Promise((res,rej)=>c.toBlob(x=>x?res(x):rej(new Error('Bildkonvertierung fehlgeschlagen')),'image/jpeg',.9))}finally{bmp.close?.()}
  }
  function clean(v){return String(v??'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').replace(/[\r\n\t]+/g,' ').trim()}

  async function buildWithDocs(p,year){
    if(typeof buildAnnualPdfBlob!=='function')throw new Error('Jahresabschluss-PDF-Funktion fehlt');
    const L=await loadPdfLib(),{PDFDocument,StandardFonts,rgb}=L,base=buildAnnualPdfBlob(p,year),out=await PDFDocument.load(await base.arrayBuffer()),regular=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold),docs=annualDocuments(year),A4=[595.28,841.89];
    if(docs.length){const cover=out.addPage(A4);cover.drawText('Rechnungen und Dokumente',{x:42,y:790,size:21,font:bold,color:rgb(.08,.16,.11)});cover.drawText(`Jahresabschluss ${year} - ${docs.length} Anlage${docs.length===1?'':'n'}`,{x:42,y:758,size:12,font:regular});let yy=720;for(let i=0;i<docs.length;i++){if(yy<60){break}cover.drawText(`${i+1}. ${clean(docs[i].title||docs[i].filename||kind(docs[i])).slice(0,80)}`,{x:52,y:yy,size:9,font:regular,maxWidth:490});yy-=15}}
    let included=0,missing=0;
    for(const meta of docs){const b=await getBlob(meta);if(!b){const pg=out.addPage(A4);pg.drawText('Anlage nicht verfügbar',{x:42,y:790,size:18,font:bold});pg.drawText(clean(meta.title||meta.filename||kind(meta)),{x:42,y:755,size:11,font:regular,maxWidth:510});missing++;continue}const mime=String(b.type||meta.mime||'').toLowerCase(),fn=String(meta.filename||'').toLowerCase();try{if(mime.includes('pdf')||fn.endsWith('.pdf')){const src=await PDFDocument.load(await b.arrayBuffer(),{ignoreEncryption:true}),pages=await out.copyPages(src,src.getPageIndices());pages.forEach(pg=>out.addPage(pg));included++}else if(mime.startsWith('image/')){const ib=await imageForPdf(b),bytes=await ib.arrayBuffer(),img=String(ib.type||'').includes('png')?await out.embedPng(bytes):await out.embedJpg(bytes),pg=out.addPage(A4);pg.drawText(clean(meta.title||meta.filename||kind(meta)).slice(0,90),{x:42,y:808,size:11,font:bold,maxWidth:510});pg.drawText(`${clean(kind(meta))} - ${clean(F(meta.date))}`,{x:42,y:790,size:8,font:regular});const maxW=511,maxH=725,scale=Math.min(maxW/img.width,maxH/img.height),w=img.width*scale,h=img.height*scale;pg.drawImage(img,{x:(A4[0]-w)/2,y:45+(maxH-h)/2,width:w,height:h});included++}else{missing++}}catch(e){console.warn('Anlage',e);missing++}}
    return {blob:new Blob([await out.save()],{type:'application/pdf'}),included,missing,total:docs.length};
  }
  async function deliverPdf(blob,name,title){
    if(typeof File!=='undefined'&&navigator.share){const f=new File([blob],name,{type:'application/pdf'}),can=!navigator.canShare||navigator.canShare({files:[f]});if(can){try{await navigator.share({title,files:[f]});return}catch(e){if(e?.name==='AbortError')return}}}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
  }
  async function saveWithDocs(){
    const p=P(),y=typeof closingYear!=='undefined'?closingYear:Y(); if(!p)return;
    const docs=annualDocuments(y); if(!docs.length){try{toast('Keine Dokumente gefunden – normale PDF wird erstellt')}catch{};return saveAnnualPdf()}
    try{try{toast(`PDF mit ${docs.length} Anlage${docs.length===1?'':'n'} wird erstellt …`)}catch{};const r=await buildWithDocs(p,y),base=(typeof annualPdfFilename==='function'?annualPdfFilename(p,y):`CampManager-Jahresabschluss-${y}.pdf`).replace(/\.pdf$/i,''),name=base+'-mit-Rechnungen-und-Dokumenten.pdf';await deliverPdf(r.blob,name,`CampManager Jahresabschluss ${y} mit Anlagen`);try{toast(r.missing?`PDF erstellt: ${r.included} eingebunden, ${r.missing} nicht verfügbar`:`PDF mit ${r.included} Anlagen erstellt`)}catch{}}catch(err){console.error(err);if(confirm('Dokumente konnten nicht eingebunden werden. Jahresabschluss ohne Anlagen speichern?'))saveAnnualPdf()}
  }

  // Render-Wrapper statt nur MutationObserver: Belegbereich kommt zuverlässig nach jedem Kosten-Neuaufbau.
  try{
    if(typeof renderCosts==='function'){
      const original=renderCosts;
      renderCosts=function(...args){const r=original.apply(this,args);setTimeout(injectReceiptUI,0);return r};
    }
  }catch(e){console.warn('renderCosts wrapper',e)}
  const host=document.querySelector('#v-costs'); if(host)new MutationObserver(()=>setTimeout(injectReceiptUI,0)).observe(host,{childList:true,subtree:false});

  document.addEventListener('click',e=>{
    const cam=e.target.closest('[data-costreceipt-camera]');if(cam){e.preventDefault();e.stopPropagation();pickReceipt(cam.dataset.costreceiptCamera,'camera');return}
    const lib=e.target.closest('[data-costreceipt-library]');if(lib){e.preventDefault();e.stopPropagation();pickReceipt(lib.dataset.costreceiptLibrary,'library');return}
    const file=e.target.closest('[data-costreceipt-file]');if(file){e.preventDefault();e.stopPropagation();pickReceipt(file.dataset.costreceiptFile,'file');return}
    const ed=e.target.closest('[data-costreceipt-edit]');if(ed){e.preventDefault();editReceipt(ed.dataset.costreceiptEdit);return}
    const del=e.target.closest('[data-costreceipt-del]');if(del){e.preventDefault();deleteReceipt(del.dataset.costreceiptDel);return}

    // Wichtig: #pdfBtn wird NICHT abgefangen. So öffnet der Jahresabschluss immer original.
    const close=e.target.closest('[data-close]');if(close&&pendingPdfChoice)pendingPdfChoice=false;
    const saveBtn=e.target.closest('#reportSaveBtn');
    if(saveBtn&&!pendingPdfChoice){e.preventDefault();e.stopImmediatePropagation();askPdfChoice();return}
    const choice=e.target.closest('[data-cm-pdfchoice]');
    if(choice){e.preventDefault();e.stopImmediatePropagation();const yes=choice.dataset.cmPdfchoice==='yes';pendingPdfChoice=false;try{closeModal()}catch{};if(yes)saveWithDocs();else saveAnnualPdf();return}
  },true);

  document.addEventListener('submit',e=>{
    const f=e.target;if(!(f instanceof HTMLFormElement)||f.id!=='cmReceiptEditForm')return;e.preventDefault();
    const p=P(),d=(p?.documents||[]).find(x=>x.id===f.dataset.id&&x.category==='cost_receipt');if(!d)return;
    const v=Object.fromEntries(new FormData(f).entries());d.title=v.title||d.title;d.date=v.date||d.date;d.year=v.year||d.year;d.note=v.note||'';
    try{closeModal()}catch{};if(typeof save==='function')save();else if(typeof persist==='function')persist();if(typeof renderCosts==='function')renderCosts();try{toast('Rechnung aktualisiert')}catch{}
  },true);

  // Dokumentkategorie im normalen Dokumentbereich ergänzen.
  try{if(Array.isArray(DOCCAT)&&!DOCCAT.some(x=>x?.[0]==='cost_receipt'))DOCCAT.splice(1,0,['cost_receipt','Rechnung / Beleg'])}catch{}

  // Sichtbare Add-on-Version. APP_VERSION/Datenschlüssel bleiben unberührt, damit bestehende Daten sicher bleiben.
  const badge=document.querySelector('.ver');if(badge)badge.textContent='v63';document.title='CampManager v63';
  setTimeout(injectReceiptUI,0);
})();
