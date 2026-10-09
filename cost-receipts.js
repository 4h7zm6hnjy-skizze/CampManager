'use strict';
/* CampManager v61 add-on
   - Rechnungen/Belege an allen Kostenstellen
   - Kamera oder Mediathek
   - Kfz-Tarif: Übernachtungen wählen nur die eine aktuelle Tarifstufe
*/
(() => {
  if (window.__campmanagerV61Installed) return;
  window.__campmanagerV61Installed = true;

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
  if (badge) badge.textContent = 'v61';
  document.title = 'CampManager v61';

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

  // Falls die Ansicht bereits offen ist, neu zeichnen, damit auch der Kfz-Fix sofort sichtbar ist.
  try {
    if (typeof renderCosts === 'function') renderCosts();
  } catch {}
})();
