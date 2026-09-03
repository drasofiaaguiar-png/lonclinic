#!/usr/bin/env node
'use strict';

const path = require('path');
const cvi = require('../cvi');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node scripts/import-cvi-csv.js <ficheiro.csv>');
    process.exit(1);
}

const resolved = path.resolve(filePath);
const result = cvi.importCsvFile(resolved);
console.log(`Imported ${result.imported} rows from ${path.basename(resolved)}`);
console.log(`Store now has ${result.total} centres (${result.verified} verified, ${result.withExperience} with call notes)`);
console.log(`updatedAt: ${result.updatedAt}`);
console.log(`Wrote ${cvi.DATA_PATH}`);
