const fs = require('fs');
const path = 'server/static/app.js';
let content = fs.readFileSync(path, 'utf8');

// Fix remaining unitMap usages for firstUnit and secondUnit
// We need to handle cases where u.firstUnit is already populated (object) vs just an ID (string)

// Helper function to create the replacement string
// usage: unitMap[u.firstUnit] -> (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])

const fixFirst = "unitMap[u.firstUnit]";
const replaceFirst = "(u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])";

const fixSecond = "unitMap[u.secondUnit]";
const replaceSecond = "(u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])";

// Apply global replacement
content = content.split(fixFirst).join(replaceFirst);
content = content.split(fixSecond).join(replaceSecond);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed remaining unitMap usages in app.js');
