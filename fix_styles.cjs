const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const dir = 'public/templates';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(file => {
  try {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    let xml = zip.file('word/styles.xml').asText();
    
    if (xml.includes('<w:pPrDefault>')) {
      xml = xml.replace(/<w:pPrDefault>[\s\S]*?<\/w:pPrDefault>/, '<w:pPrDefault><w:pPr><w:jc w:val="both" /><w:spacing w:after="0" w:before="0" w:line="240" w:lineRule="auto" /></w:pPr></w:pPrDefault>');
      zip.file('word/styles.xml', xml);
      const buffer = zip.generate({ type: 'nodebuffer' });
      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully patched styles in ${file}`);
    } else {
      console.log(`No pPrDefault found in ${file}`);
    }
  } catch (e) {
    console.error(`Error processing ${file}:`, e.message);
  }
});
