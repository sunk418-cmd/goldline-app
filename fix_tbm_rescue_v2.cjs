const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Clean EVERYTHING
xml = xml.replace(/\{|\}/g, '');
xml = xml.replace(/\(|\)/g, '');

// 2. Define exact tags to restore
const tags = [
    'projectName', 'companyName', 'date', 'approvalNo', 'witness', 'witnessPhone', 'jobName', 'workTime'
];

for (let i = 0; i < 16; i++) {
    tags.push(`worker_${i}_name`);
    tags.push(`worker_${i}_role`);
    tags.push(`worker_${i}_phone`);
    tags.push(`worker_${i}_companyName`);
    tags.push(`%worker_${i}_signature`);
    tags.push(`%worker_${i}_name_handwritten`);
    // Add risk assessment tags
    tags.push(`task_${i}_task`);
    tags.push(`task_${i}_details`);
    tags.push(`factor_${i}_jobType`);
    tags.push(`factor_${i}_factor`);
    tags.push(`factor_${i}_measure`);
}

// Sort tags by length descending to avoid partial matches (e.g. worker_0_name vs worker_0_name_handwritten)
tags.sort((a, b) => b.length - a.length);

// 3. Restore tags with { }
tags.forEach(tag => {
    // We use a global regex with word boundaries or just replace all instances
    // Since we removed all { }, we can safely look for the literal string.
    // However, some strings like 'date' might be part of other words.
    // We'll use a safer regex:
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTag, 'g');
    xml = xml.replace(regex, `{${tag}}`);
});

// 4. Final Cleanup: ensure no double braces
while (xml.includes('{{')) xml = xml.replace(/\{\{/g, '{');
while (xml.includes('}}')) xml = xml.replace(/\}\}/g, '}');

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Deeply rescued tbm.docx with exact tag matching');
