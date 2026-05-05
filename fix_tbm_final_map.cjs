const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// Re-apply sequential mapping for companyName
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
let cIdx = 0;
xml = xml.replace(/\{companyName\}/g, () => {
    if (cIdx < seq.length) return `{worker_${seq[cIdx++]}_companyName}`;
    return '{companyName}';
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Final mapping applied to tbm.docx');
