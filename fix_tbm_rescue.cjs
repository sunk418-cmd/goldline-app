const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Remove all parentheses as requested
xml = xml.replace(/\(|\)/g, '');

// 2. Remove all existing braces to start fresh
// But wait, some tags might be split. Let's clean split tags first.
xml = xml.replace(/\{([^}]*)\}/g, (match) => match.replace(/<\/w:t>.*?<w:t>/g, ''));

// 3. Fix corrupted tags like {worker_{worker_7_name} or _name}
// We'll use a regex to find ANY worker related string and wrap it cleanly.
const workerPatterns = [
    /worker_\d+_name/g,
    /worker_\d+_companyName/g,
    /%worker_\d+_signature/g,
    /worker_\d+_open_paren/g,
    /worker_\d+_close_paren/g,
    /projectName/g,
    /companyName/g,
    /date/g,
    /approvalNo/g,
    /witness/g,
    /witnessPhone/g,
    /jobName/g,
    /workTime/g
];

// Remove all existing braces first
xml = xml.replace(/\{|\}/g, '');

// Now re-wrap all known patterns
workerPatterns.forEach(pattern => {
    xml = xml.replace(pattern, (match) => `{${match}}`);
});

// Remove the now-useless paren tags if they were re-wrapped
xml = xml.replace(/\{worker_\d+_open_paren\}|\{worker_\d+_close_paren\}/g, '');

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Rescued tbm.docx by resetting all braces and removing parentheses');
