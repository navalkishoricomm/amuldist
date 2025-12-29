const fs = require('fs');
const path = 'server/static/app.js';

try {
  const buffer = fs.readFileSync(path);
  let content = buffer.toString('binary');
  
  // The file seems to have null bytes injected or is partly UTF-16.
  // We will simply remove all null bytes \x00.
  // This is safe for source code which shouldn't contain null bytes.
  
  // However, we should be careful if the file is valid UTF-16 (with BOM).
  // But since node failed at line 1667, it's likely mixed or just corrupted.
  // The start was valid JS (UTF-8/ASCII).
  
  const cleanContent = content.replace(/\x00/g, '');
  
  fs.writeFileSync(path, cleanContent, 'utf8');
  console.log('File cleaned successfully.');
} catch (e) {
  console.error('Error fixing file:', e);
}
