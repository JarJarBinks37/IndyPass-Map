import test from 'node:test';
import assert from 'node:assert/strict';
import { filterResorts, sortResorts, formatMetric, validateDataset } from '../src/data.js';
import { fixture } from './fixture.js';
test('shared filters combine search, region, and minimum vertical', () => {
  assert.deepEqual(filterResorts(fixture.resorts, { search: 'vermont', region: 'Northeast U.S.', minimumVertical: 1500 }).map(r => r.id), ['alpha']);
  assert.equal(filterResorts(fixture.resorts, { region: 'Japan', minimumVertical: 1 }).length, 0);
  const washington = { ...fixture.resorts[0], location: 'Chewelah, WA, USA' };
  assert.equal(filterResorts([washington], { search: 'Washington' }).length, 1);
  assert.equal(filterResorts([{ ...washington, country: 'Canada' }], { search: 'Washington' }).length, 0);
});
test('every statistic sorts both directions, missing values always last', () => {
  for (const key of ['summit', 'vertical', 'trails', 'lifts', 'acres']) for (const direction of ['asc', 'desc']) {
    const rows = sortResorts(fixture.resorts, key, direction);
    const known = rows.filter(r => r.stats[key] != null).map(r => r.stats[key]);
    assert.deepEqual(known, [...known].sort((a,b) => direction === 'asc' ? a-b : b-a));
    assert.equal(rows.slice(known.length).every(r => r.stats[key] == null), true);
  }
  assert.notEqual(sortResorts(fixture.resorts, 'summit', 'desc')[0].id, sortResorts(fixture.resorts, 'vertical', 'desc')[0].id);
});
test('units preserve unknown values and convert lengths and area', () => {
  assert.equal(formatMetric(null, 'vertical'), '');
  assert.equal(formatMetric(1000, 'vertical', 'metric'), '305 m');
  assert.equal(formatMetric(100, 'acres', 'metric'), '40 ha');
});
test('data validation rejects unsourced statistics, duplicate IDs, and invalid coordinates', () => {
  validateDataset(fixture);
  const missing = structuredClone(fixture); delete missing.resorts[0].statSources.summit;
  assert.throws(() => validateDataset(missing), /unsourced summit/);
  const duplicate = structuredClone(fixture); duplicate.resorts[1].id = 'alpha';
  assert.throws(() => validateDataset(duplicate), /duplicate/);
  const invalid = structuredClone(fixture); invalid.resorts[0].coordinates = [100, 0];
  assert.throws(() => validateDataset(invalid), /coordinates/);
});
test('annual skier visits require a source and reporting period and sort with blanks last', () => {
  const data = structuredClone(fixture);
  data.resorts[0].stats.skierVisits = 120000;
  assert.throws(() => validateDataset(data), /period/);
  data.resorts[0].skierVisitsPeriod = '2025–26';
  assert.throws(() => validateDataset(data), /unsourced skierVisits/);
  data.resorts[0].statSources.skierVisits = 'https://example.com/report';
  validateDataset(data);
  for (const direction of ['asc', 'desc']) assert.equal(sortResorts(data.resorts, 'skierVisits', direction)[0].id, 'alpha');
});
