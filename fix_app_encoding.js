const fs = require('fs');
const path = 'server/static/app.js';

try {
  const buffer = fs.readFileSync(path);
  let content = buffer.toString('binary');
  
  // Remove null bytes
  const cleanContent = content.replace(/\x00/g, '');
  
  fs.writeFileSync(path, cleanContent, 'utf8');
  console.log('Cleaned app.js from null bytes');
} catch (e) {
  console.error('Error:', e);
}
