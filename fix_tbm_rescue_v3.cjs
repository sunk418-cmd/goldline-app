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
    tags.push(`task_${i}_task`);
    tags.push(`task_${i}_details`);
    tags.push(`factor_${i}_jobType`);
    tags.push(`factor_${i}_factor`);
    tags.push(`factor_${i}_measure`);
}

// Sort tags by length descending
tags.sort((a, b) => b.length - a.length);

// 3. Restore tags with { } using a safer replacement
// We'll replace them with a unique ID first to avoid double-wrapping
const map = new Map();
tags.forEach((tag, index) => {
    const id = `__TAG_${index}__`;
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the tag ONLY if it's not already part of a __TAG_ID__
    const regex = new RegExp(`(?<![a-zA-Z0-9_%])${escapedTag}(?![a-zA-Z0-9_%])`, 'g');
    if (xml.match(regex)) {
        xml = xml.replace(regex, id);
        map.set(id, `{${tag}}`);
    }
});

// Now replace IDs with actual tags
map.forEach((value, id) => {
    xml = xml.replace(new RegExp(id, 'g'), value);
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Successfully rescued tbm.docx with ID-based matching');
