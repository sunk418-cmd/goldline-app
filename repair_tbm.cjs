const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Clean ALL braces
xml = xml.replace(/\{|\}/g, '');

// 2. Fix the specific repetitions found
xml = xml.replace(/(worker_\d+_)+companyName/g, (match) => {
    const m = match.match(/worker_\d+_/);
    return m[0] + 'companyName';
});

// 3. Fix the missing prefix for _name
// If we find _name, _role, _signature without a worker prefix, we have a problem.
// But wait, the table is sequential.
// Let's just remove EVERYTHING that looks like a worker tag and re-insert them.

// First, remove all traces of worker tags (even corrupted ones)
xml = xml.replace(/worker_\d+_[a-zA-Z0-9_]+/g, 'WORKER_PLACEHOLDER');
xml = xml.replace(/_name|_signature|_role|_phone/g, 'WORKER_PLACEHOLDER');
// (Some might be escaped or split, but we did a deep clean before)

// Now we have a document with many WORKER_PLACEHOLDERs.
// We need to map them back to {worker_i_...}
// Order in TBM: 
// Row 1: Left(0) Left(0) Left(0), Right(7) Right(7) Right(7)
// Wait, each row has 3 fields: Company, Role, Name/Sign.
// So 6 placeholders per row.

let pIdx = 0;
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
// Each entry in seq will have 3 tags: companyName, role, name/signature
xml = xml.replace(/WORKER_PLACEHOLDER/g, () => {
    const workerIdx = seq[Math.floor(pIdx / 3)];
    const fieldType = pIdx % 3;
    pIdx++;
    if (fieldType === 0) return `{worker_${workerIdx}_companyName}`;
    if (fieldType === 1) return `{worker_${workerIdx}_role}`;
    // For the 3rd field, we want BOTH name and signature
    return `{worker_${workerIdx}_name} {%worker_${workerIdx}_signature}`;
});

// Restore common tags
const commonTags = ['projectName', 'date', 'approvalNo', 'witness', 'witnessPhone', 'jobName', 'workTime'];
commonTags.forEach(tag => {
    xml = xml.replace(new RegExp(tag, 'g'), `{${tag}}`);
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Repaired tbm.docx by re-building the worker table from scratch');
