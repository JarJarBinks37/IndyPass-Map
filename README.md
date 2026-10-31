# Independent Lines

A desktop-first Indy Pass resort explorer with a locally bundled world map, shared search and geographic/vertical filters, sortable statistics, resort source links, metric/imperial units, and comparison of up to four resorts. Works on smaller screens too. No API key or backend required.

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

## Data status — incomplete

**The production dataset is empty. This version does not yet contain the current official resort list.** The environment blocked access to the official Indy Pass website during development. No membership, coordinates, or statistics have been guessed or copied from memory. The app displays this limitation explicitly.

Enable `indyskipass.com` and `www.indyskipass.com` in the environment network settings, then verify the current season's full directory at https://www.indyskipass.com/our-resorts. Resort websites may require additional domain permissions. Membership changes seasonally; don't label the dataset complete until all directory entries have been reconciled. Distinguish alpine, cross-country, and other partner categories when checking what the official list includes.

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

The Natural Earth basemap is bundled through `world-atlas`; no external tile requests or geocoding services are used. Leaflet provides map interaction. This is an independent project, not affiliated with Indy Pass.
