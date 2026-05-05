const fs = require('fs');
const PizZip = require('pizzip');

try {
  const filePath = 'public/templates/alcohol.docx';
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();
  
  for (let i = 0; i < 10; i++) {
    // Replace {worker_i_date} with {worker_i_alcoholDate}
    xml = xml.replace(`{worker_${i}_date}`, `{worker_${i}_alcoholDate}`);
    
    // Now we need to find the empty cell immediately following the cell with {worker_i_alcoholDate}
    // We can use a regex to capture the first cell, and then inject into the second cell.
    // The cell starts with <w:tc> and ends with </w:tc>
    const regex = new RegExp(`(<w:tc>.*?>\\{worker_${i}_alcoholDate\\}<\\/w:t>.*?<\\/w:tc>\\s*<w:tc>.*?)<\\/w:p>\\s*<\\/w:tc>`);
    xml = xml.replace(regex, `$1<w:r><w:t>{worker_${i}_alcoholTime}</w:t></w:r></w:p></w:tc>`);
  }

  zip.file('word/document.xml', xml);
  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
  
  console.log('Successfully patched alcohol.docx with alcoholDate and alcoholTime');
} catch (e) {
  console.error(e);
}
