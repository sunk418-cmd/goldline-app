const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/tbm.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

const idx = xml.indexOf('worker_0_name');
if (idx !== -1) {
    console.log(xml.substring(idx - 500, idx + 1000));
} else {
    console.log('Not found');
}
