const fs = require('fs');
const path = 'server/static/app.js';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Encoding
// Replace corrupted multiplication sign
// The user might not have seen this yet or didn't report it, but I saw it in the file read.
// "Ã" is C3 97 (multiplication sign in UTF-8 interpreted as Latin1)
content = content.replace(/Ã/g, '\u00D7');

// Replace corrupted Rupee symbol
// "â¹" is E2 82 B9 (Rupee sign in UTF-8 interpreted as Latin1)
content = content.replace(/â¹/g, '\u20B9');

// Fix 2: Compound Unit Logic
// Handle populated p.unit in renderStockIn and renderStockOut
const logicOld = "const u = p.unit ? unitMap[p.unit] : null;";
const logicNew = "const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;";

if (content.indexOf(logicOld) === -1) {
    console.log("Warning: logicOld not found. Check whitespace.");
}
content = content.split(logicOld).join(logicNew);

// Fix 3: Handle populated firstUnit/secondUnit
const firstOld = "const first = isCompound ? unitMap[u.firstUnit] : null;";
const firstNew = "const first = isCompound ? (u.firstUnit && typeof u.firstUnit === 'object' ? u.firstUnit : unitMap[u.firstUnit]) : null;";

const secondOld = "const second = isCompound ? unitMap[u.secondUnit] : null;";
const secondNew = "const second = isCompound ? (u.secondUnit && typeof u.secondUnit === 'object' ? u.secondUnit : unitMap[u.secondUnit]) : null;";

content = content.split(firstOld).join(firstNew);
content = content.split(secondOld).join(secondNew);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed app.js logic and encoding');
