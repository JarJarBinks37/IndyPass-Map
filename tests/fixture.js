export const fixture = {
  status: 'partial', season: 'TEST FIXTURE ONLY', verifiedAt: '2026-10-31', directoryUrl: 'https://www.indyskipass.com/our-resorts', note: 'Synthetic browser test data; not real resorts.',
  resorts: [
    { id: 'alpha', name: 'Test Alpine', country: 'United States', location: 'Vermont', region: 'Northeast U.S.', website: 'https://example.com', membershipSource: 'https://www.indyskipass.com/our-resorts', coordinates: [44, -72], coordinateSource: 'https://example.com', stats: { summit: 4000, vertical: 2000, trails: 50, lifts: 4, acres: 200 }, statSources: Object.fromEntries(['summit','vertical','trails','lifts','acres'].map(k => [k, 'https://example.com'])) },
    { id: 'beta', name: 'Test Birch', country: 'Japan', location: 'Hokkaido', region: 'Japan', website: 'https://example.com', membershipSource: 'https://www.indyskipass.com/our-resorts', coordinates: [43, 141], coordinateSource: 'https://example.com', stats: { summit: 3000, vertical: null, trails: 20, lifts: 2, acres: null }, statSources: { summit: 'https://example.com', trails: 'https://example.com', lifts: 'https://example.com' } },
    { id: 'cedar', name: 'Test Cedar', country: 'United States', location: 'Vermont', region: 'Northeast U.S.', website: 'https://example.com', membershipSource: 'https://www.indyskipass.com/our-resorts', coordinates: null, stats: { summit: 5000, vertical: 1000, trails: 30, lifts: 3, acres: 100 }, statSources: Object.fromEntries(['summit','vertical','trails','lifts','acres'].map(k => [k, 'https://example.com'])) },
  ]
};
