const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Fix double open/close braces
xml = xml.replace(/\{\{/g, '{');
xml = xml.replace(/\}\}/g, '}');

// 2. Clean split tags (common in manual editing)
xml = xml.replace(/\{([^}]*)\}/g, (match) => {
    return match.replace(/<\/w:t>.*?<w:t>/g, '');
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Fixed double braces and split tags in user template');
