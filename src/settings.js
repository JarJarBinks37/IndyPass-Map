import { metrics } from './data.js';

const KEY = 'independent-lines-personal-edits-v1';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const integerMetrics = new Set(['trails', 'lifts', 'skierVisits']);

export function setupSettings(dataset, onChange) {
  const baseline = structuredClone(dataset.resorts);
  let edits = {};
  let storageError = '';
  try { edits = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { storageError = 'Saved edits could not be read. They have not been changed.'; }
  if (!edits || Array.isArray(edits) || typeof edits !== 'object') { edits = {}; storageError = 'Saved edits could not be read. They have not been changed.'; }
  function applyEdits() {
    dataset.resorts = baseline.map(original => {
      const resort = structuredClone(original);
      const changes = edits[resort.id];
      resort.personalStats = {};
      for (const key of Object.keys(metrics)) {
        const entry = changes?.[key];
        if (!entry || typeof entry !== 'object' || !Object.hasOwn(entry, 'value')) continue;
        const value = entry.value;
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integerMetrics.has(key) && !Number.isInteger(value)))) continue;
        if (key === 'skierVisits' && value !== null && (typeof entry.period !== 'string' || !entry.period.trim())) continue;
        resort.stats[key] = value;
        resort.personalStats[key] = true;
        delete resort.statSources[key];
        if (key === 'skierVisits') resort.skierVisitsPeriod = entry.period || '';
      }
      return resort;
    });
  }
  applyEdits();
  document.querySelector('.page-footer').insertAdjacentHTML('beforeend', `<button type="button" id="open-settings" class="settings-open">⚙ Settings</button>`);
  document.body.insertAdjacentHTML('beforeend', `<dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title"><div class="settings-head"><div><p class="eyebrow">YOUR RESORT DATA</p><h2 id="settings-title">Edit resort statistics</h2></div><button type="button" id="settings-close" class="settings-close" aria-label="Close settings">×</button></div><p class="settings-description">Edits are saved only in this browser on this device. They override the supplied figures on your map and table and are not verified.</p><div class="settings-controls"><label>Category<select id="edit-category">${Object.entries(metrics).map(([key,m]) => `<option value="${key}">${esc(m.label)}</option>`).join('')}</select></label><label>Find resorts<input type="search" id="edit-search" placeholder="Name or location"></label></div><p id="edit-unit" class="settings-help"></p><div class="bulk-controls"><button type="button" id="select-visible">Select visible</button><button type="button" id="deselect-all">Clear selection</button><label>Set selected to <input type="number" id="bulk-value" min="0" step="any" placeholder="Value"></label><label id="bulk-period-label">Season <input type="text" id="bulk-period" placeholder="2024–25"></label><button type="button" id="fill-selected">Fill selected</button></div><p class="settings-help">Edit values individually or fill selected rows. Clear a value to leave it blank. Select rows to restore their original values.</p><div class="settings-list" id="settings-list"></div><div class="settings-actions"><button type="button" id="restore-selected">Restore selected</button><button type="button" id="save-edits" class="primary-action">Save edits</button></div><p id="edit-message" role="status" aria-live="polite"></p></dialog>`);
  const dialog = document.querySelector('#settings-dialog');
  const list = document.querySelector('#settings-list');
  const category = document.querySelector('#edit-category');
  const message = document.querySelector('#edit-message');
  let dirty = false;
  function rows() { return [...list.querySelectorAll('.edit-row')]; }
  function close() { if (dirty && !confirm('Discard unsaved edits?')) return; dirty = false; dialog.close(); }
  function displayRows() {
    const key = category.value;
    document.querySelector('#bulk-period-label').hidden = key !== 'skierVisits';
    const label = metrics[key].label;
    const unit = metrics[key].unit;
    document.querySelector('#edit-unit').textContent = unit ? `Enter ${label.toLowerCase()} in ${unit === 'ac' ? 'acres' : unit}; units do not change with the map setting.` : `Enter ${label.toLowerCase()} as a whole number.${key === 'skierVisits' ? ' Include the reporting season for each value.' : ''}`;
    list.innerHTML = dataset.resorts.map(r => `<div class="edit-row" data-id="${esc(r.id)}" data-search="${esc(`${r.name} ${r.location} ${r.country}`.toLowerCase())}"><label class="edit-name"><input type="checkbox" class="edit-check" aria-label="Select ${esc(r.name)}"><span>${esc(r.name)}<small>${esc(r.location)}</small></span></label><label><span class="sr-only">${esc(label)} for ${esc(r.name)}</span><input class="edit-value" type="number" min="0" step="${integerMetrics.has(key) ? '1' : 'any'}" value="${r.stats[key] ?? ''}" placeholder="Blank"></label>${key === 'skierVisits' ? `<label><span class="sr-only">Reporting season for ${esc(r.name)}</span><input class="edit-period" value="${esc(r.skierVisitsPeriod || '')}" placeholder="Season, e.g. 2024–25"></label>` : ''}</div>`).join('');
    filterRows();
  }
  function filterRows() { const q = document.querySelector('#edit-search').value.trim().toLowerCase(); rows().forEach(row => { row.hidden = !row.dataset.search.includes(q); }); }
  document.querySelector('#open-settings').onclick = () => { category.value = 'skierVisits'; category.dataset.previous = category.value; message.textContent = storageError; dirty = false; displayRows(); dialog.showModal(); };
  document.querySelector('#settings-close').onclick = close;
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  category.addEventListener('change', () => { if (dirty && !confirm('Discard unsaved edits and change category?')) { category.value = category.dataset.previous; return; } dirty = false; category.dataset.previous = category.value; message.textContent = ''; displayRows(); });
  category.addEventListener('focus', () => { category.dataset.previous = category.value; });
  document.querySelector('#edit-search').oninput = filterRows;
  list.addEventListener('input', e => { if (e.target.matches('.edit-value, .edit-period')) { e.target.closest('.edit-row').querySelector('.edit-check').checked = true; dirty = true; } });
  document.querySelector('#select-visible').onclick = () => rows().filter(r => !r.hidden).forEach(r => { r.querySelector('.edit-check').checked = true; });
  document.querySelector('#deselect-all').onclick = () => rows().forEach(r => { r.querySelector('.edit-check').checked = false; });
  document.querySelector('#fill-selected').onclick = () => { const val = document.querySelector('#bulk-value').value; const selected = rows().filter(r => r.querySelector('.edit-check').checked); if (!selected.length || val === '') { message.textContent = 'Select resorts and enter a value to fill.'; return; } selected.forEach(r => { r.querySelector('.edit-value').value = val; const period = r.querySelector('.edit-period'); if (period && document.querySelector('#bulk-period').value.trim()) period.value = document.querySelector('#bulk-period').value.trim(); }); dirty = true; message.textContent = `Filled ${selected.length} selected resorts. Save to apply.`; };
  function persist(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { message.textContent = 'Could not save in this browser. Your previous saved data is unchanged.'; return false; }
    edits = next; storageError = ''; applyEdits(); onChange(); return true;
  }
  document.querySelector('#save-edits').onclick = () => {
    if (storageError) { message.textContent = storageError; return; }
    const selected = rows().filter(r => r.querySelector('.edit-check').checked);
    if (!selected.length) { message.textContent = 'Select at least one resort to save.'; return; }
    const key = category.value, next = structuredClone(edits);
    for (const row of selected) {
      const input = row.querySelector('.edit-value');
      const value = input.value === '' ? null : input.valueAsNumber;
      const period = row.querySelector('.edit-period')?.value.trim() || '';
      if (value !== null && (!Number.isFinite(value) || value < 0 || (integerMetrics.has(key) && !Number.isInteger(value)))) { message.textContent = 'Enter a valid non-negative value for each selected resort; counts must be whole numbers.'; input.focus(); return; }
      if (key === 'skierVisits' && value !== null && !period) { message.textContent = 'Enter a reporting season for each annual visits value.'; row.querySelector('.edit-period').focus(); return; }
      next[row.dataset.id] ||= {}; next[row.dataset.id][key] = { value, period };
    }
    if (persist(next)) { dirty = false; message.textContent = `Saved ${selected.length} resort${selected.length === 1 ? '' : 's'} in this browser.`; displayRows(); }
  };
  document.querySelector('#restore-selected').onclick = () => {
    if (storageError) { message.textContent = storageError; return; }
    const selected = rows().filter(r => r.querySelector('.edit-check').checked);
    if (!selected.length) { message.textContent = 'Select at least one resort to restore.'; return; }
    const next = structuredClone(edits); let changed = 0;
    for (const row of selected) if (next[row.dataset.id]?.[category.value]) { delete next[row.dataset.id][category.value]; if (!Object.keys(next[row.dataset.id]).length) delete next[row.dataset.id]; changed++; }
    if (!changed) { message.textContent = 'No saved edits to restore for the selected category.'; return; }
    if (!confirm(`Restore the original ${metrics[category.value].label} values for ${changed} resort${changed === 1 ? '' : 's'}?`)) return;
    if (persist(next)) { dirty = false; message.textContent = `Restored ${changed} resort${changed === 1 ? '' : 's'}.`; displayRows(); }
  };
}
