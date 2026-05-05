const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// The user has 14 instances of {worker_0_companyName}
// We replace them sequentially with the correct indexed tags.
// Table order: Row 1 Left(0), Row 1 Right(7), Row 2 Left(1), Row 2 Right(8)...
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
let i = 0;
xml = xml.replace(/\{worker_0_companyName\}/g, () => {
    if (i < seq.length) {
        return `{worker_${seq[i++]}_companyName}`;
    }
    return '{worker_0_companyName}';
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Fixed sequential companyName tags in TBM template. Count:', i);
