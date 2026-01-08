const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'static', 'app.js');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace garbled Rupee symbol
  // Note: We use the unicode escape sequence or the actual character depending on how it's read
  // If the file was saved as UTF-8 but contains these bytes, we might need to be careful.
  // The grep output showed "â¹" and "Ã".
  
  let newContent = content.replace(/â¹/g, '₹');
  newContent = newContent.replace(/Ã/g, '×');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed encoding issues in app.js');
  } else {
    console.log('No encoding issues found (or string matching failed).');
  }
} catch (err) {
  console.error('Error fixing file:', err);
}
