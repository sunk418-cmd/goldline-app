const fs = require('fs');
const PizZip = require('pizzip');

try {
  const filePath = 'public/templates/railway.docx';
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();
  
  const seq = [0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  let i = 0;
  
  // Replace {companyName} sequentially according to the table layout
  xml = xml.replace(/\{companyName\}/g, (match) => {
    if (i < 16) {
      const repl = `{worker_${seq[i]}_companyName}`;
      i++;
      return repl;
    }
    return match; // If there are more than 16, leave them alone
  });

  zip.file('word/document.xml', xml);
  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
  console.log('Successfully patched companyName in railway.docx. Replaced count:', i);
} catch (e) {
  console.error(e);
}
