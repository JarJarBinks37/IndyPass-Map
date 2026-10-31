export const regions = ['All regions', 'Northeast U.S.', 'Midwest U.S.', 'West', 'Canada', 'Europe', 'Japan', 'Other'];
export const metrics = {
  summit: { label: 'Summit elevation', unit: 'ft', metricUnit: 'm', factor: 0.3048 },
  vertical: { label: 'Vertical drop', unit: 'ft', metricUnit: 'm', factor: 0.3048 },
  trails: { label: 'Trails', unit: '', factor: 1 },
  lifts: { label: 'Lifts', unit: '', factor: 1 },
  acres: { label: 'Skiable area', unit: 'ac', metricUnit: 'ha', factor: 0.40468564224 },
};
export function formatMetric(value, key, units = 'imperial') {
  if (value == null) return '';
  const metric = metrics[key];
  return `${Math.round(value * (units === 'metric' ? metric.factor : 1)).toLocaleString('en-US')}${metric.unit ? ` ${units === 'metric' ? metric.metricUnit : metric.unit}` : ''}`;
}
export function filterResorts(resorts, { search = '', region = 'All regions', minimumVertical = 0 } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return resorts.filter(r => (region === 'All regions' || r.region === region)
    && `${r.name} ${r.country} ${r.location}`.toLocaleLowerCase().includes(query)
    && (!minimumVertical || (r.stats.vertical != null && r.stats.vertical >= minimumVertical)));
}
export function sortResorts(resorts, key = 'name', direction = 'asc') {
  return [...resorts].sort((a, b) => {
    const x = key in metrics ? a.stats[key] : a[key];
    const y = key in metrics ? b.stats[key] : b[key];
    if (x == null) return y == null ? a.name.localeCompare(b.name) : 1;
    if (y == null) return -1;
    const result = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return (direction === 'asc' ? result : -result) || a.name.localeCompare(b.name);
  });
}
export function validateDataset(data) {
  const fail = message => { throw new Error(message); };
  const url = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
  if (!['unavailable', 'partial', 'verified'].includes(data.status) || !Array.isArray(data.resorts)) fail('Invalid dataset status or resorts array');
  if (!url(data.directoryUrl) || !/(^|\.)indyskipass\.com$/.test(new URL(data.directoryUrl).hostname)) fail('Directory must link to the official Indy Pass site');
  if (data.status === 'unavailable' && data.resorts.length) fail('Unavailable dataset must be empty');
  if (data.status !== 'unavailable' && (!data.season || !data.verifiedAt || !data.resorts.length)) fail('Populated data requires season, verification date, and resorts');
  const ids = new Set();
  for (const r of data.resorts) {
    if (!r.id || ids.has(r.id)) fail('Missing or duplicate resort ID');
    ids.add(r.id);
    if (!r.name || typeof r.location !== 'string' || typeof r.country !== 'string' || !regions.slice(1).includes(r.region)) fail(`Invalid location: ${r.id}`);
    if ((r.website && !/^https?:\/\//.test(r.website)) || !url(r.membershipSource) || !/(^|\.)indyskipass\.com$/.test(new URL(r.membershipSource).hostname)) fail(`Missing official membership source or website: ${r.id}`);
    if (!r.stats || !r.statSources) fail(`Missing stats: ${r.id}`);
    if (r.coordinates != null && (!Array.isArray(r.coordinates) || r.coordinates.length !== 2 || !r.coordinates.every(Number.isFinite) || Math.abs(r.coordinates[0]) > 90 || Math.abs(r.coordinates[1]) > 180 || !url(r.coordinateSource))) fail(`Invalid or unsourced coordinates: ${r.id}`);
    for (const key of Object.keys(metrics)) {
      const value = r.stats[key];
      if (value != null && (!Number.isFinite(value) || value < 0 || !url(r.statSources[key]))) fail(`Invalid or unsourced ${key}: ${r.id}`);
      if (['lifts', 'trails'].includes(key) && value != null && !Number.isInteger(value)) fail(`Non-integer count: ${r.id}`);
    }
  }
  return data;
}
