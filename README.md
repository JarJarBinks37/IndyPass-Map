# Independent Lines

A desktop-first Indy Pass resort explorer with satellite imagery and a bundled fallback map, shared search and geographic/vertical filters, sortable statistics, resort source links, metric/imperial units, and comparison of up to four resorts. Works on smaller screens too. No API key or backend required.

## Run

Requires Node.js 22.12+ (validated on 24.19.0).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

`npm run test:browser` runs the Chromium interaction tests. The configuration uses `/usr/bin/chromium` supplied in this cloud environment; adjust `executablePath` for another machine. Browser tests intercept the data module with synthetic fixtures; these are never shipped as resort data.

## Data status

The dataset contains 288 entries from the official Indy Pass directory, accessed October 31, 2026, including Alpine, cross-country, Cat & Heli and Learn to Turn partners. Official directory cards provide coordinates and some statistics; resort detail pages supply further figures and links. Membership and figures may change; the site does not state a season in the extracted directory, so the snapshot is marked partial. Missing fields are blank. Geographic groups are assigned from the listed locations and some incomplete addresses remain in Other. Check source links before relying on figures.

## Populate verified data

Edit `data/resorts.json` after reviewing the official sources. Set `status` to `partial` while importing; use `verified` only after reconciling the complete current official directory. Fill `season`, an ISO `verifiedAt` date, and a plain-language `note` describing scope. Each resort has this shape:

```json
{
  "id": "stable-resort-id",
  "name": "Resort name",
  "location": "State, province, or prefecture",
  "country": "Country",
  "region": "Northeast U.S.",
  "website": "https://official-resort-domain.example",
  "membershipSource": "https://www.indyskipass.com/official-resort-page",
  "coordinates": null,
  "coordinateSource": null,
  "stats": { "summit": null, "vertical": null, "trails": null, "lifts": null, "acres": null },
  "statSources": {}
}
```

This example is a schema guide, not a real resort. Regions are defined in `src/data.js`. Store summit elevation and vertical drop separately, in feet; area in acres; counts as integers. Missing statistics must be `null`, not zero. For each known statistic, add its official source URL under the same key in `statSources`. Coordinates are `[latitude, longitude]`, require a `coordinateSource`, and may be null; resorts without coordinates remain in the table. Never substitute a town center for an unverified resort position. Review what resort-reported area includes before comparing it.

`npm run validate:data` checks IDs, ranges, URL shapes, and required provenance fields. **It cannot verify the truth of a statistic, whether a URL is official for a resort, or directory completeness.** These need source review. Unknown values display blank and sort last in both directions. Minimum-vertical filtering excludes resorts with unknown vertical. Comparison selections persist across filtering so mountains in different regions can be compared.

The map requests Esri World Imagery tiles, which may not show winter conditions, and falls back to bundled Natural Earth geography if imagery cannot load. Resort detail pages link to official Indy Pass trail maps where available; some links lead to a resort page rather than a printable file. Verified summit photos and ski-trail geometry are not included. Leaflet provides map interaction. This is an independent project, not affiliated with Indy Pass.
