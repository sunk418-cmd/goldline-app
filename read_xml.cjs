const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/tbm.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

console.log('Worker 0 related text:');
const regex = /worker_0_[a-zA-Z0-9_]+/g;
const matches = xml.match(regex);
console.log(matches);

const snippetIdx = xml.indexOf('worker_0');
if (snippetIdx !== -1) {
    console.log('Snippet:', xml.substring(snippetIdx - 50, snippetIdx + 200));
}
