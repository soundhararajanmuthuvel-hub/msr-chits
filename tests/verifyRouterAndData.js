import fs from 'fs';

console.log('====================================================');
console.log('API ROUTER & ACTION AUDIT');
console.log('====================================================');

const apiContent = fs.readFileSync('src/services/api.js', 'utf8');
const codeContent = fs.readFileSync('backend-app-script/Code.gs', 'utf8');

const apiActions = new Set();
const callRegex = /(?:postApi|fetchGet)\s*\(\s*['"]([^'"]+)['"]/g;
let match;
while ((match = callRegex.exec(apiContent)) !== null) {
  apiActions.add(match[1]);
}

const actionRegex = /action:\s*['"]([^'"]+)['"]/g;
while ((match = actionRegex.exec(apiContent)) !== null) {
  apiActions.add(match[1]);
}

const urlRegex = /action=([a-zA-Z0-9_-]+)/g;
while ((match = urlRegex.exec(apiContent)) !== null) {
  apiActions.add(match[1]);
}

const codeCases = new Set();
const caseRegex = /case\s*['"]([^'"]+)['"]\s*:/g;
while ((match = caseRegex.exec(codeContent)) !== null) {
  codeCases.add(match[1]);
}

console.log('Found ' + apiActions.size + ' distinct API actions called in src/services/api.js:');
console.log(Array.from(apiActions).sort().join(', '));
console.log('\nFound ' + codeCases.size + ' router cases in backend-app-script/Code.gs:');
console.log(Array.from(codeCases).sort().join(', '));

let missingCount = 0;
console.log('\n--- VERIFYING EACH FRONTEND ACTION AGAINST ROUTER ---');
for (const a of Array.from(apiActions).sort()) {
  if (codeCases.has(a)) {
    console.log(`✅ [MATCH] Action "${a}" is supported in Code.gs`);
  } else {
    console.log(`❌ [MISSING] Action "${a}" is NOT supported in Code.gs!`);
    missingCount++;
  }
}

console.log('====================================================');
if (missingCount === 0) {
  console.log(`ALL ${apiActions.size} API ACTIONS ARE VERIFIED AGAINST CODE.GS ROUTER (100% COVERAGE)`);
} else {
  console.log(`WARNING: ${missingCount} actions missing from router!`);
  process.exit(1);
}
