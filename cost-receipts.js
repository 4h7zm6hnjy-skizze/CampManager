'use strict';
/* CampManager v62 add-on
   - Rechnungen/Belege an allen Kostenstellen
   - Kamera oder Mediathek
   - Kfz-Tarif: Übernachtungen wählen nur die eine aktuelle Tarifstufe
*/
(() => {
  if (window.__campmanagerV62Installed) return;
  window.__campmanagerV62Installed = true;

  const RECEIPT_LABELS = {
    annualRent: 'Jahresmiete / Jahresbeitrag',
    deposit: 'Kaution',
    insurance: 'Versicherung',
    taxes: 'Steuer',
    installments: 'Ratenzahlung',
    electricity: 'Strom',
    travel: 'Hin- & Rückfahrten',
    costs: 'Jahresbeitrag / Reparatur / Neuanschaffung / Sonstiges',
    petroleum: 'Petroleum',
    gasbottles: 'Gas'
  };

  function escLocal(value) {
    if (typeof esc === 'function') return esc(value);
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function formatDate(value) {
    if (typeof fmt === 'function') return fmt(value);
    if (!value) return '–';
    const d = new Date(value + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('de-DE');
  }

  function receiptDocs(section) {
    try {
      return (place().documents || [])
        .filter(x => x.category === 'cost_receipt' && x.costSection === section)
        .sort((a,b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
    } catch {
      return [];
    }
  }

  function receiptBlock(section) {
    const label = RECEIPT_LABELS[section];
    if (!label) return '';
    const docs = receiptDocs(section);
    const cards = docs.length
      ? `<div class="docgrid">${docs.map(x => `
          <div class="doc">
            <div class="docthumb" data-docopen="${escLocal(x.id)}">🧾</div>
            <div class="rowtitle" style="margin-top:8px">${escLocal(x.title || (label + ' Rechnung'))}</div>
            <div class="rowsub">${formatDate(x.date)}${x.year ? ' · ' + escLocal(x.year) : ''}</div>
            ${x.note ? `<div class="rowsub">${escLocal(x.note)}</div>` : ''}
            <div class="toolbar">
              <button class="mini" type="button" data-docopen="${escLocal(x.id)}">Öffnen</button>
              <button class="mini" type="button" data-costreceipt-edit="${escLocal(x.id)}">✎</button>
              <button class="mini danger" type="button" data-costreceipt-del="${escLocal(x.id)}">×</button>
            </div>
          </div>`).join('')}</div>`
      : `<div class="empty">Noch keine Rechnung oder kein Beleg für diesen Kostenbereich gespeichert.</div>`;

    return `
      <div class="divider"></div>
      <div class="card full cm-cost-receipts" data-cm-cost-receipts="${escLocal(section)}">
        <h2>🧾 Rechnungen & Belege – ${escLocal(label)}</h2>
        <p>Rechnung direkt fotografieren oder ein vorhandenes Bild aus der Mediathek auswählen.</p>
        <div class="toolbar">
          <button class="btn" type="button" data-costreceipt-camera="${escLocal(section)}">📷 Foto aufnehmen</button>
          <button class="btn sec" type="button" data-costreceipt-library="${escLocal(section)}">🖼️ Aus Mediathek</button>
        </div>
        ${cards}
      </div>`;
  }

  function currentCostSection() {
    try { return tab && tab.costs ? tab.costs : ''; }
    catch { return ''; }
  }

  function appendReceiptBlock() {
    const section = currentCostSection();
    if (!RECEIPT_LABELS[section]) return;
    const host = document.querySelector('#v-costs');
    if (!host) return;
    const old = host.querySelector('.cm-cost-receipts');
    if (old && old.dataset.cmCostReceipts === section) return;
    old?.remove();
    host.insertAdjacentHTML('beforeend', receiptBlock(section));

    if (section === 'annualRent') {
      const notices = host.querySelectorAll('.notice.good');
      if (notices.length) {
        notices[0].innerHTML =
          '<b>Jahresmiete:</b> Die Personenberechnung bleibt unverändert. ' +
          'Beim <b>Auto</b> bestimmen die tatsächlichen Übernachtungen ausschließlich die aktuelle Kfz-Tarifstufe. ' +
          'Berechnet wird <b>Anzahl Autos × Tarif dieser Stufe</b>. Das Auto wird nicht unter Personen abgerechnet.';
      }
    }
  }

  async function saveReceiptFile(file, section) {
    if (!file) return;
    const label = RECEIPT_LABELS[section];
    if (!label) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast?.('Bitte ein Foto oder Bild auswählen');
      return;
    }
    try {
      await saveInsuranceFile(file, {
        category: 'cost_receipt',
        costSection: section,
        title: label + ' Rechnung',
        date: typeof today === 'function' ? today() : new Date().toISOString().slice(0,10),
        year: String(typeof yearNow === 'function' ? yearNow() : new Date().getFullYear())
      });
      if (typeof renderCosts === 'function') renderCosts();
      setTimeout(appendReceiptBlock, 0);
    } catch (err) {
      console.error('Rechnung konnte nicht gespeichert werden', err);
      toast?.('Rechnung konnte nicht gespeichert werden');
    }
  }

  function pickReceipt(section, camera) {
    if (!RECEIPT_LABELS[section]) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    if (camera) input.setAttribute('capture', 'environment');
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (file) await saveReceiptFile(file, section);
    };
    input.oncancel = () => input.remove();
    input.click();
  }

  function editReceipt(id) {
    const doc = (place().documents || []).find(x => x.id === id && x.category === 'cost_receipt');
    if (!doc) return;
    const sectionLabel = RECEIPT_LABELS[doc.costSection] || 'Kosten';
    modal('Rechnung bearbeiten',
      `<form id="cmReceiptEditForm" data-id="${escLocal(id)}">
        <div class="formgrid">
          ${field('Titel','title',doc.title || (sectionLabel + ' Rechnung'),'text','required')}
          ${field('Belegdatum','date',doc.date || today(),'date','required')}
          ${field('Jahr','year',doc.year || yearNow(),'number','min="2000"')}
          ${area('Notiz','note',doc.note || '')}
        </div>
      </form>`,
      actions('cmReceiptEditForm')
    );
  }

  async function deleteReceipt(id) {
    const doc = (place().documents || []).find(x => x.id === id && x.category === 'cost_receipt');
    if (!doc) return;
    if (!confirm('Rechnung / Beleg wirklich löschen?')) return;
    try {
      place().documents = (place().documents || []).filter(x => x.id !== id);
      if (typeof dbDel === 'function') await dbDel(id).catch(() => {});
      if (doc.cloudPath && typeof deleteDocumentCloud === 'function') {
        deleteDocumentCloud(doc.cloudPath).catch(() => {});
      }
      save();
      if (typeof renderCosts === 'function') renderCosts();
      setTimeout(appendReceiptBlock, 0);
      toast?.('Rechnung gelöscht');
    } catch (err) {
      console.error(err);
      toast?.('Rechnung konnte nicht gelöscht werden');
    }
  }

  // Kfz-Fix: Die tatsächlichen Übernachtungen wählen genau EINE Tarifstufe.
  // Das Auto bleibt ein eigener Kostenposten und wird niemals als Person berechnet.
  try {
    const originalTieredRentBreakdown = tieredRentBreakdown;
    tieredRentBreakdown = function(p, x) {
      const b = originalTieredRentBreakdown(p, x);
      const used = Math.max(0, Math.min(365, Number(b.used || 0)));
      const index = used <= 0 ? -1 : used <= 90 ? 0 : used <= 180 ? 1 : 2;
      const carCount = Math.max(0, Number(x?.carCount || 0));
      const carRates = Array.isArray(b.carRates)
        ? b.carRates.map(Number)
        : [x?.carRate1, x?.carRate2, x?.carRate3].map(Number);
      const previousCarCost = Number(b.carCost || 0);
      const carTier = [0,0,0];
      let carCost = 0;
      if (index >= 0 && carCount > 0) {
        carTier[index] = carCount;
        carCost = carCount * Number(carRates[index] || 0);
      }
      b.carCount = carCount;
      b.carTier = carTier;
      b.carTierNights = carTier;
      b.carPresenceNights = used;
      b.carCost = carCost;
      b.total = Number(b.total || 0) - previousCarCost + carCost;
      return b;
    };
  } catch (err) {
    console.warn('Kfz-Tarif-Fix konnte nicht installiert werden', err);
  }

  // Kategorie im zentralen Dokumentbereich verfügbar machen.
  try {
    if (Array.isArray(DOCCAT) && !DOCCAT.some(x => x?.[0] === 'cost_receipt')) {
      DOCCAT.splice(1, 0, ['cost_receipt', 'Rechnung / Beleg']);
    }
  } catch {}

  // Versionsanzeige der Erweiterung.
  const badge = document.querySelector('.ver');
  if (badge) badge.textContent = 'v62';
  document.title = 'CampManager v62';

  // Nach jedem Neuaufbau der Kostenansicht den passenden Belegbereich ergänzen.
  const costHost = document.querySelector('#v-costs');
  if (costHost) {
    const observer = new MutationObserver(() => setTimeout(appendReceiptBlock, 0));
    observer.observe(costHost, {childList:true, subtree:false});
  }
  setTimeout(appendReceiptBlock, 0);

  document.addEventListener('click', e => {
    const camera = e.target.closest('[data-costreceipt-camera]');
    if (camera) {
      e.preventDefault();
      pickReceipt(camera.dataset.costreceiptCamera, true);
      return;
    }
    const library = e.target.closest('[data-costreceipt-library]');
    if (library) {
      e.preventDefault();
      pickReceipt(library.dataset.costreceiptLibrary, false);
      return;
    }
    const edit = e.target.closest('[data-costreceipt-edit]');
    if (edit) {
      e.preventDefault();
      editReceipt(edit.dataset.costreceiptEdit);
      return;
    }
    const del = e.target.closest('[data-costreceipt-del]');
    if (del) {
      e.preventDefault();
      deleteReceipt(del.dataset.costreceiptDel);
    }
  }, true);

  document.addEventListener('submit', e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'cmReceiptEditForm') return;
    e.preventDefault();
    const id = form.dataset.id;
    const doc = (place().documents || []).find(x => x.id === id && x.category === 'cost_receipt');
    if (!doc) return;
    const data = Object.fromEntries(new FormData(form).entries());
    doc.title = data.title || doc.title;
    doc.date = data.date || doc.date;
    doc.year = data.year || doc.year;
    doc.note = data.note || '';
    closeModal();
    save();
    if (typeof renderCosts === 'function') renderCosts();
    setTimeout(appendReceiptBlock, 0);
    toast?.('Rechnung aktualisiert');
  }, true);


  // Jahresabschluss: vor dem Öffnen fragen, ob Rechnungen und Dokumente
  // des gewählten Jahres als echte PDF-Anlagen eingebunden werden sollen.
  let annualIncludeDocuments = null;

  function annualDocuments(year) {
    const y = String(year || '');
    try {
      return (place().documents || [])
        .filter(d => {
          const dy = String(d.year || '');
          const date = String(d.date || '');
          const created = String(d.createdAt || '');
          return dy === y || date.startsWith(y) || created.startsWith(y);
        })
        .sort((a,b) => String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || '')));
    } catch {
      return [];
    }
  }

  function docKindLabel(d) {
    try {
      if (typeof docLabel === 'function') return docLabel(d.category);
    } catch {}
    if (d.category === 'cost_receipt') return 'Rechnung / Beleg';
    if (d.category === 'insurance') return 'Versicherungsdokument';
    if (d.category === 'insurance_claim') return 'Schadenfoto';
    return 'Dokument';
  }

  function askAnnualDocumentChoice() {
    const docs = annualDocuments(closingYear);
    const count = docs.length;
    modal('Jahresabschluss PDF', `
      <div class="notice good"><b>Rechnungen & Dokumente</b><br>
      Sollen alle Rechnungen und Dokumente für <b>${escLocal(closingYear)}</b> mit in die PDF eingebunden werden?</div>
      <div class="card full"><h2>${count} Dokument${count === 1 ? '' : 'e'} gefunden</h2>
      <p>Bei „Ja“ werden Bilder als eigene PDF-Seiten angehängt. Bereits vorhandene PDF-Dokumente werden mit ihren Originalseiten übernommen.</p></div>`,
      `<button class="btn" type="button" data-annual-doc-choice="yes">Ja – mit Rechnungen & Dokumenten</button>
       <button class="btn sec" type="button" data-annual-doc-choice="no">Nein – nur Jahresabschluss</button>
       <button class="btn sec" type="button" data-close>Abbrechen</button>`
    );
  }

  function openAnnualAfterChoice(includeDocs) {
    annualIncludeDocuments = !!includeDocs;
    closeModal();
    openPdf();
    const c = document.querySelector('#reportContent');
    if (c) {
      const count = annualDocuments(closingYear).length;
      c.insertAdjacentHTML('afterbegin', `<div class="notice ${includeDocs ? 'good' : ''}" style="margin-bottom:14px"><b>PDF-Anlagen:</b> ${includeDocs ? `${count} Rechnung(en) / Dokument(e) werden beim Speichern eingebunden.` : 'Rechnungen und Dokumente werden nicht eingebunden.'}</div>`);
    }
  }

  function loadPdfLib() {
    if (window.PDFLib?.PDFDocument) return Promise.resolve(window.PDFLib);
    if (window.__cmPdfLibPromise) return window.__cmPdfLibPromise;
    const urls = [
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
    ];
    window.__cmPdfLibPromise = new Promise((resolve,reject) => {
      let index = 0;
      const next = () => {
        if (window.PDFLib?.PDFDocument) return resolve(window.PDFLib);
        if (index >= urls.length) return reject(new Error('PDF-Bibliothek konnte nicht geladen werden'));
        const script = document.createElement('script');
        script.src = urls[index++];
        script.async = true;
        script.onload = () => window.PDFLib?.PDFDocument ? resolve(window.PDFLib) : next();
        script.onerror = () => { script.remove(); next(); };
        document.head.appendChild(script);
      };
      next();
    }).catch(err => { window.__cmPdfLibPromise = null; throw err; });
    return window.__cmPdfLibPromise;
  }

  async function getAnnualDocumentBlob(meta) {
    let blob = null;
    try { blob = await dbGet(meta.id); } catch {}
    if (!blob && meta?.cloudPath && typeof downloadDocumentCloud === 'function') {
      try {
        blob = await downloadDocumentCloud(meta.cloudPath);
        if (blob) await dbPut(meta.id, blob).catch(() => {});
      } catch (err) { console.warn('Dokument aus Cloud', err); }
    }
    return blob;
  }

  async function imageBlobForPdf(blob) {
    const type = String(blob?.type || '').toLowerCase();
    if (type.includes('jpeg') || type.includes('jpg') || type.includes('png')) return blob;
    if (!type.startsWith('image/')) return blob;
    const bmp = await createImageBitmap(blob);
    try {
      const max = 2200, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
      return await new Promise((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Bildkonvertierung fehlgeschlagen')), 'image/jpeg', 0.9));
    } finally { bmp.close?.(); }
  }

  function cleanPdfText(value) {
    return String(value ?? '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[\r\n\t]+/g, ' ').trim();
  }

  async function buildAnnualPdfWithDocuments(p, year) {
    const PDFLib = await loadPdfLib();
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const baseBlob = buildAnnualPdfBlob(p, year);
    const out = await PDFDocument.load(await baseBlob.arrayBuffer());
    const regular = await out.embedFont(StandardFonts.Helvetica);
    const bold = await out.embedFont(StandardFonts.HelveticaBold);
    const docs = annualDocuments(year);
    const A4 = [595.28, 841.89];

    const addTitlePage = (meta, extra='') => {
      const page = out.addPage(A4);
      page.drawText('Anlage zum Jahresabschluss', {x:42,y:790,size:20,font:bold,color:rgb(0.08,0.16,0.11)});
      page.drawText(cleanPdfText(meta.title || meta.filename || docKindLabel(meta)), {x:42,y:750,size:15,font:bold,maxWidth:510});
      page.drawText('Art: ' + cleanPdfText(docKindLabel(meta)), {x:42,y:720,size:10,font:regular});
      page.drawText('Datum: ' + cleanPdfText(formatDate(meta.date || '')), {x:42,y:702,size:10,font:regular});
      if (meta.filename) page.drawText('Datei: ' + cleanPdfText(meta.filename), {x:42,y:684,size:10,font:regular,maxWidth:510});
      if (extra) page.drawText(cleanPdfText(extra), {x:42,y:650,size:10,font:regular,maxWidth:510,lineHeight:14});
      return page;
    };

    if (docs.length) {
      const cover = out.addPage(A4);
      cover.drawText('Rechnungen und Dokumente', {x:42,y:790,size:21,font:bold,color:rgb(0.08,0.16,0.11)});
      cover.drawText(`Jahresabschluss ${year} - ${docs.length} Anlage${docs.length===1?'':'n'}`, {x:42,y:756,size:12,font:regular});
      let y = 720;
      docs.forEach((d,i) => {
        if (y < 70) return;
        cover.drawText(`${i+1}. ${cleanPdfText(d.title || d.filename || docKindLabel(d)).slice(0,75)}`, {x:52,y,size:9,font:regular,maxWidth:490});
        y -= 15;
      });
    }

    let included = 0, missing = 0;
    for (const meta of docs) {
      const blob = await getAnnualDocumentBlob(meta);
      if (!blob) {
        addTitlePage(meta, 'Die gespeicherte Datei war auf diesem Gerät und in der Cloud nicht verfügbar.');
        missing++;
        continue;
      }
      const mime = String(blob.type || meta.mime || '').toLowerCase();
      const filename = String(meta.filename || '').toLowerCase();
      try {
        if (mime.includes('pdf') || filename.endsWith('.pdf')) {
          addTitlePage(meta, 'Das folgende PDF-Dokument wurde im Original angehängt.');
          const source = await PDFDocument.load(await blob.arrayBuffer(), {ignoreEncryption:true});
          const copied = await out.copyPages(source, source.getPageIndices());
          copied.forEach(page => out.addPage(page));
          included++;
        } else if (mime.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(filename)) {
          const imgBlob = await imageBlobForPdf(blob);
          const bytes = await imgBlob.arrayBuffer();
          const imgType = String(imgBlob.type || '').toLowerCase();
          const image = imgType.includes('png') ? await out.embedPng(bytes) : await out.embedJpg(bytes);
          const page = out.addPage(A4);
          const title = cleanPdfText(meta.title || meta.filename || docKindLabel(meta));
          page.drawText(title.slice(0,90), {x:42,y:808,size:11,font:bold,maxWidth:510});
          page.drawText(`${cleanPdfText(docKindLabel(meta))} - ${cleanPdfText(formatDate(meta.date || ''))}`, {x:42,y:790,size:8,font:regular});
          const maxW=511, maxH=725, scale=Math.min(maxW/image.width,maxH/image.height);
          const w=image.width*scale,h=image.height*scale;
          page.drawImage(image,{x:(A4[0]-w)/2,y:45+(maxH-h)/2,width:w,height:h});
          included++;
        } else {
          addTitlePage(meta, 'Dieser Dateityp kann nicht als sichtbare PDF-Seite eingebettet werden.');
          missing++;
        }
      } catch (err) {
        console.warn('Dokument konnte nicht eingebettet werden', meta, err);
        addTitlePage(meta, 'Das Dokument konnte nicht eingebettet werden: ' + (err?.message || 'unbekannter Fehler'));
        missing++;
      }
    }

    const bytes = await out.save();
    return {blob:new Blob([bytes],{type:'application/pdf'}), included, missing, total:docs.length};
  }

  async function shareOrDownloadPdf(blob, name, title) {
    if (typeof File !== 'undefined' && navigator.share) {
      const file = new File([blob], name, {type:'application/pdf'});
      const can = !navigator.canShare || navigator.canShare({files:[file]});
      if (can) {
        try { await navigator.share({title, files:[file]}); return true; }
        catch (e) { if (e?.name === 'AbortError') return true; console.warn('PDF teilen', e); }
      }
    }
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
    return true;
  }

  async function saveAnnualPdfWithDocuments() {
    try {
      const p = place();
      const docs = annualDocuments(closingYear);
      if (!docs.length) {
        toast?.('Keine Rechnungen oder Dokumente für dieses Jahr gefunden - normale PDF wird erstellt');
        return saveAnnualPdf();
      }
      toast?.(`PDF mit ${docs.length} Anlage${docs.length===1?'':'n'} wird erstellt …`);
      const result = await buildAnnualPdfWithDocuments(p, closingYear);
      const base = annualPdfFilename(p, closingYear).replace(/\.pdf$/i,'');
      const name = base + '-mit-Rechnungen-und-Dokumenten.pdf';
      await shareOrDownloadPdf(result.blob, name, `CampManager Jahresabschluss ${closingYear} mit Anlagen`);
      if (result.missing) toast?.(`PDF erstellt: ${result.included} eingebunden, ${result.missing} nicht vollständig verfügbar`);
      else toast?.(`PDF mit ${result.included} Anlagen erstellt`);
    } catch (err) {
      console.error('PDF mit Dokumenten', err);
      const fallback = confirm('Rechnungen/Dokumente konnten nicht eingebunden werden. Jahresabschluss ohne Anlagen erstellen?');
      if (fallback) saveAnnualPdf();
      else toast?.('PDF-Erstellung abgebrochen');
    }
  }

  // Diese Capture-Handler laufen vor den vorhandenen CampManager-Handlern.
  document.addEventListener('click', e => {
    const pdfOpen = e.target.closest('#pdfBtn');
    if (pdfOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      askAnnualDocumentChoice();
      return;
    }
    const choice = e.target.closest('[data-annual-doc-choice]');
    if (choice) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openAnnualAfterChoice(choice.dataset.annualDocChoice === 'yes');
      return;
    }
    const saveBtn = e.target.closest('#reportSaveBtn');
    if (saveBtn && annualIncludeDocuments === true) {
      e.preventDefault();
      e.stopImmediatePropagation();
      saveAnnualPdfWithDocuments();
    }
  }, true);

  // Falls die Ansicht bereits offen ist, neu zeichnen, damit auch der Kfz-Fix sofort sichtbar ist.
  try {
    if (typeof renderCosts === 'function') renderCosts();
  } catch {}
})();
