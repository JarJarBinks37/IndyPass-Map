import { readFile } from 'node:fs/promises';
import { validateDataset } from '../src/data.js';
const data = validateDataset(JSON.parse(await readFile(new URL('../data/resorts.json', import.meta.url))));
console.log(`Dataset valid: ${data.resorts.length} resorts; status=${data.status}. URL checks enforce provenance fields, not factual accuracy.`);
