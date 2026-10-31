import L from 'leaflet';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import 'leaflet/dist/leaflet.css';
import './style.css';
import dataset from '../data/resorts.json';
import { regions, metrics, filterResorts, sortResorts, formatMetric, validateDataset, rankColors } from './data.js';

validateDataset(dataset);
const state = { search: '', region: 'All regions', minimumVertical: 0, view: 'map', heat: 'vertical', units: 'imperial', sort: 'name', direction: 'asc', selected: null, compare: new Set() };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
document.querySelector('#app').innerHTML = `
  <header><a class="brand" href="./"><span class="brand-icon">↟</span> INDEPENDENT LINES</a><span class="header-note">THE INDY PASS RESORT EXPLORER</span><a class="official" href="${dataset.directoryUrl}" target="_blank" rel="noopener noreferrer">Official Indy Pass ↗</a></header>
  <main><section class="intro"><div><p class="eyebrow">LESS CROWDED. MORE MOUNTAIN.</p><h1>Find your next <em>independent line.</em></h1><p class="lede">Explore the mountains. Compare the numbers. Find your kind of skiing.</p></div><div class="season"><span class="status-dot"></span> ${dataset.season ? escape(dataset.season) : 'AWAITING VERIFIED DIRECTORY'}<small>${dataset.verifiedAt ? `Verified ${escape(dataset.verifiedAt)}` : 'Membership verification pending'}</small></div></section>
  <aside class="notice"><span aria-hidden="true">ⓘ</span><div><strong>${dataset.status === 'verified' ? 'Source-backed resort data' : dataset.status === 'partial' ? 'Partial directory — more resorts need verification' : 'The explorer is built. The verified directory is pending.'}</strong><p>${escape(dataset.note || 'Unavailable statistics are left blank. Follow source links to review reported figures.')} <a href="${dataset.directoryUrl}" target="_blank" rel="noopener noreferrer">View official directory ↗</a></p></div></aside>
  <section class="explorer" aria-label="Resort explorer"><div class="tools"><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search resorts, states, places…" aria-label="Search resorts"></label><label class="vertical-label">Vertical drop<select id="vertical"><option value="0">Any vertical</option><option value="1000">1,000+ ft / 305+ m</option><option value="2000">2,000+ ft / 610+ m</option><option value="3000">3,000+ ft / 914+ m</option></select></label><label class="unit-label">Units<select id="units"><option value="imperial">ft / acres</option><option value="metric">m / hectares</option></select></label><div class="view-toggle" role="group" aria-label="View"><button data-view="map" aria-pressed="true">◉ Map</button><button data-view="table" aria-pressed="false">☷ Table</button></div></div>
  <nav id="regions" aria-label="Geographic regions">${regions.map((r, i) => `<button data-region="${escape(r)}" aria-pressed="${i === 0}">${escape(r)}</button>`).join('')}</nav>
  <div class="results-bar"><span id="result-count" role="status"></span><button id="reset" class="text-button">Reset filters ↺</button></div>
  <div id="map-view"><div id="map" aria-label="Interactive resort map"></div><div class="map-heat"><label for="heat-category">COLOR BY</label><select id="heat-category">${Object.entries(metrics).map(([key, metric]) => `<option value="${key}" ${key === state.heat ? 'selected' : ''}>${escape(metric.label)}</option>`).join('')}</select><div class="heat-legend"><span>Lower rank</span><i></i><span>Higher rank</span></div><div class="heat-missing" id="heat-status" role="status"></div></div><div class="map-label">INDEPENDENT MOUNTAINS. WORLDWIDE.</div><div id="map-empty"></div><aside id="detail" hidden></aside></div>
  <div id="table-view" hidden></div><div id="comparison" hidden></div>
  <footer class="explorer-footer"><span><i class="legend-dot"></i> Verified resort locations <span class="footer-divider">/</span> Select up to 4 resorts to compare</span><span>Blank means unverified or unavailable.</span></footer></section>
  <footer class="page-footer"><span>Made for the independent spirit.</span><span>Independent project · Not affiliated with Indy Pass</span></footer></main>`;

const map = L.map('map', { center: [39, -50], zoom: 2, minZoom: 1, maxZoom: 18, zoomControl: false, worldCopyJump: true, attributionControl: true });
L.control.zoom({ position: 'bottomleft' }).addTo(map);
map.attributionControl.addAttribution('Basemap: Natural Earth');
map.createPane('fallback');
map.getPane('fallback').style.zIndex = 150;
L.geoJSON(feature(world, world.objects.countries), { pane: 'fallback', interactive: false, style: { color: '#465a61', weight: 0.7, fillColor: '#293e45', fillOpacity: 1 } }).addTo(map);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imagery © Esri and its contributors', className: 'satellite-tiles' }).addTo(map);
const markers = L.layerGroup().addTo(map);
const bounds = { 'All regions': [[15, -145], [65, 145]], 'Northeast U.S.': [[36, -83], [48, -65]], 'Midwest U.S.': [[36, -103], [50, -80]], West: [[29, -130], [51, -102]], Canada: [[43, -140], [65, -52]], Europe: [[36, -12], [70, 36]], Japan: [[30, 128], [46, 146]], Other: [[-55, -170], [70, 170]] };
function visible() { return sortResorts(filterResorts(dataset.resorts, state), state.sort, state.direction); }
function compareButton(r) { return `<button class="compare-button" data-compare="${escape(r.id)}" aria-pressed="${state.compare.has(r.id)}">${state.compare.has(r.id) ? '✓ Comparing' : '+ Compare'}</button>`; }
function showDetail(id) {
  state.selected = id;
  const r = dataset.resorts.find(r => r.id === id);
  const panel = document.querySelector('#detail');
  panel.hidden = !r;
  if (!r) return;
  panel.innerHTML = `<button id="close-detail" class="close" aria-label="Close resort details">×</button><p class="eyebrow">${escape(r.region)}${r.categories?.length ? ` · ${escape(r.categories.join(' / '))}` : ''}</p><h2>${escape(r.name)}</h2><p>${escape([r.location, r.country].filter(Boolean).join(' · '))}</p><dl>${Object.entries(metrics).map(([key, m]) => `<div><dt>${m.label}</dt><dd>${escape(formatMetric(r.stats[key], key, state.units))}${key === 'skierVisits' && r.stats[key] != null ? ` <small>(${escape(r.skierVisitsPeriod)})</small>` : ''}${r.stats[key] != null ? ` <a class="source" href="${escape(r.statSources[key])}" target="_blank" rel="noopener noreferrer" aria-label="Source for ${m.label}">↗</a>` : ''}</dd></div>`).join('')}</dl>${compareButton(r)}${r.trailMap ? `<a class="visit" href="${escape(r.trailMap)}" target="_blank" rel="noopener noreferrer">View resort trail map ↗</a>` : ''}<p class="source-links">Summit photo not available.</p>${r.website ? `<a class="visit" href="${escape(r.website)}" target="_blank" rel="noopener noreferrer">Official resort website ↗</a>` : ''}<p class="source-links"><a href="${escape(r.membershipSource)}" target="_blank" rel="noopener noreferrer">Pass membership source ↗</a>${r.coordinates ? ` · <a href="${escape(r.coordinateSource)}" target="_blank" rel="noopener noreferrer">Location source ↗</a>` : ''}</p>`;
  document.querySelector('#close-detail').onclick = () => showDetail(null);
}
function renderComparison() {
  const panel = document.querySelector('#comparison');
  const resorts = dataset.resorts.filter(r => state.compare.has(r.id));
  panel.hidden = !resorts.length;
  panel.innerHTML = `<div class="compare-heading"><h2>Mountain to mountain <span>${resorts.length} / 4</span></h2><button id="clear-compare" class="text-button">Clear comparison</button></div><div class="table-scroll"><table><thead><tr><th scope="col">Compare resorts</th>${resorts.map(r => `<th scope="col">${escape(r.name)} <button data-compare="${escape(r.id)}" aria-label="Remove ${escape(r.name)} from comparison">×</button></th>`).join('')}</tr></thead><tbody>${Object.entries(metrics).map(([key, m]) => `<tr><th scope="row">${m.label}</th>${resorts.map(r => `<td>${escape(formatMetric(r.stats[key], key, state.units))}${key === 'skierVisits' && r.stats[key] != null ? ` <small>(${escape(r.skierVisitsPeriod)})</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="comparison-note">Figures describe resort-reported size; reporting methods can vary. Review sources in resort details.</p>`;
  document.querySelector('#clear-compare').onclick = () => { state.compare.clear(); render(); };
}
function render() {
  const resorts = visible();
  const mapped = resorts.filter(r => r.coordinates);
  document.querySelector('#result-count').textContent = `${resorts.length} resorts${dataset.status === 'verified' ? '' : ' in verified dataset'} · ${mapped.length} mapped`;
  document.querySelectorAll('[data-region]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.region === state.region)));
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  document.querySelector('#map-view').hidden = state.view !== 'map';
  document.querySelector('#table-view').hidden = state.view !== 'table';
  const emptyMessage = dataset.resorts.length ? 'No resorts match your filters. Try another region or reset your search.' : 'Resort data has not been verified yet. The official directory is required before mountains can be plotted.';
  const overlay = document.querySelector('#map-empty');
  overlay.hidden = mapped.length > 0;
  overlay.innerHTML = `<span class="empty-icon">△</span><h2>${resorts.length ? 'No verified locations' : dataset.resorts.length ? 'No matching mountains' : 'Your next mountain starts here'}</h2><p>${escape(resorts.length ? 'Matching resorts have no verified coordinates. Browse them in the table.' : emptyMessage)}</p>`;
  markers.clearLayers();
  const withValues = resorts.filter(r => r.stats[state.heat] != null).length;
  const heatStatus = document.querySelector('#heat-status');
  heatStatus.textContent = withValues ? `${withValues} of ${resorts.length} resorts have data · ranks use filtered resorts` : `No ${metrics[state.heat].label.toLowerCase()} data for these resorts`;
  document.querySelector('.heat-legend').hidden = withValues === 0;
  const colors = rankColors(resorts, state.heat);
  for (const r of mapped) L.circleMarker(r.coordinates, { radius: 3.5, color: '#142731', weight: 1, fillColor: colors.get(r.id), fillOpacity: 1 }).bindTooltip(`${escape(r.name)}<br>${escape(metrics[state.heat].label)}: ${escape(formatMetric(r.stats[state.heat], state.heat, state.units) || 'No data')}`).on('click', () => showDetail(r.id)).addTo(markers);
  const columns = [['name', 'Resort'], ['summit', 'Summit elevation'], ['vertical', 'Vertical drop'], ['trails', 'Trails'], ['lifts', 'Lifts'], ['acres', 'Skiable area'], ['skierVisits', 'Annual Visits']];
  document.querySelector('#table-view').innerHTML = `<div class="table-scroll"><table><thead><tr>${columns.map(([key, label]) => `<th scope="col" aria-sort="${state.sort === key ? state.direction === 'asc' ? 'ascending' : 'descending' : 'none'}"><button data-sort="${key}">${label} <span>${state.sort === key ? state.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}<th scope="col">Compare</th></tr></thead><tbody>${resorts.map(r => `<tr><td><button class="resort-name" data-detail="${escape(r.id)}">${escape(r.name)}</button><small>${escape([r.location, r.country].filter(Boolean).join(' · '))}</small></td>${Object.keys(metrics).map(key => `<td>${escape(formatMetric(r.stats[key], key, state.units))}${key === 'skierVisits' && r.stats[key] != null ? ` <small>(${escape(r.skierVisitsPeriod)})</small>` : ''}</td>`).join('')}<td>${compareButton(r)}</td></tr>`).join('')}</tbody></table>${resorts.length ? '' : `<div class="table-empty"><h2>${dataset.resorts.length ? 'No matching resorts' : 'Awaiting the verified resort list'}</h2><p>${escape(emptyMessage)}</p></div>`}</div>`;
  if (state.selected && !resorts.some(r => r.id === state.selected)) state.selected = null;
  showDetail(state.selected);
  renderComparison();
  if (state.view === 'map') requestAnimationFrame(() => map.invalidateSize());
}
document.querySelector('#search').addEventListener('input', e => { state.search = e.target.value; render(); });
document.querySelector('#vertical').onchange = e => { state.minimumVertical = Number(e.target.value); render(); };
document.querySelector('#heat-category').onchange = e => { state.heat = e.target.value; render(); };
document.querySelector('#units').onchange = e => { state.units = e.target.value; render(); };
document.querySelector('#reset').onclick = () => { state.search = ''; state.region = 'All regions'; state.minimumVertical = 0; document.querySelector('#search').value = ''; document.querySelector('#vertical').value = '0'; map.fitBounds(bounds['All regions']); render(); };
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.region) { state.region = b.dataset.region; map.fitBounds(bounds[state.region]); render(); }
  if (b.dataset.view) { state.view = b.dataset.view; render(); }
  if (b.dataset.sort) { state.direction = state.sort === b.dataset.sort && state.direction === 'asc' ? 'desc' : 'asc'; state.sort = b.dataset.sort; render(); }
  if (b.dataset.detail) { state.view = 'map'; state.selected = b.dataset.detail; render(); const r = dataset.resorts.find(r => r.id === state.selected); if (r.coordinates) map.setView(r.coordinates, 6); }
  if (b.dataset.compare) {
    const id = b.dataset.compare;
    if (state.compare.has(id)) state.compare.delete(id);
    else if (state.compare.size < 4) state.compare.add(id);
    else { document.querySelector('#result-count').textContent = 'Compare up to 4 resorts. Remove one to add another.'; return; }
    render();
  }
});
render();
