const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/tbm.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

const regex = /\{#worker_(\d+)_name\}([\s\S]*?)\{\/worker_\1_name\}/g;
let match;
let foundIssue = false;
while ((match = regex.exec(xml)) !== null) {
    const sectionContent = match[2];
    if (sectionContent.includes('</w:tc>') || sectionContent.includes('<w:tc>')) {
        console.log(`Worker ${match[1]} section spans across table cells! This is not allowed.`);
        foundIssue = true;
    }
}

if (!foundIssue) {
    console.log('No cross-cell sections found.');
}
