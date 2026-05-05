const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Remove ALL my botched tags
xml = xml.replace(/\{#worker_\d+_name\}|\{\/worker_\d+_name\}/g, '');
// Also remove my company name mapping to reset it
xml = xml.replace(/\{worker_\d+_companyName\}/g, '{companyName}');

// 2. Map companyName sequentially (14 slots)
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
let cIdx = 0;
xml = xml.replace(/\{companyName\}/g, () => {
    if (cIdx < seq.length) {
        const repl = `{worker_${seq[cIdx]}_companyName}`;
        cIdx++;
        return repl;
    }
    return '{companyName}';
});

// 3. Robustly wrap name and signature in conditional sections
// We'll search for the name tag and signature tag and closing paren
for (let i = 0; i < 16; i++) {
    const nameTag = `{worker_${i}_name}`;
    const signTag = `{%worker_${i}_signature}`;
    
    const nIdx = xml.indexOf(nameTag);
    if (nIdx !== -1) {
        // Wrap the name tag itself at least
        // xml = xml.replace(nameTag, `{#worker_${i}_name}${nameTag}{/worker_${i}_name}`);
        // Wait, if I do this, the parentheses remain.
        
        // Let's try to find the signature tag after the name tag
        const sIdx = xml.indexOf(signTag, nIdx);
        if (sIdx !== -1 && sIdx < nIdx + 1000) { // Check proximity
            // Find the parenthesis ) after signTag
            const pIdx = xml.indexOf(')', sIdx);
            if (pIdx !== -1 && pIdx < sIdx + 100) {
                // We have a match! Wrap from nameTag to pIdx
                // Actually, replace the tags with sections
                const before = xml.substring(0, nIdx);
                const between = xml.substring(nIdx, pIdx + 1);
                const after = xml.substring(pIdx + 1);
                
                xml = before + `{#worker_${i}_name}` + between + `{/worker_${i}_name}` + after;
            } else {
                // No closing paren found, just wrap the name and signature tags individually or something
                xml = xml.replace(nameTag, `{#worker_${i}_name}${nameTag}{/worker_${i}_name}`);
                xml = xml.replace(signTag, `{#worker_${i}_name}${signTag}{/worker_${i}_name}`);
            }
        } else {
            // Just wrap the name tag
            xml = xml.replace(nameTag, `{#worker_${i}_name}${nameTag}{/worker_${i}_name}`);
        }
    }
}

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Cleaned and re-patched tbm.docx');
