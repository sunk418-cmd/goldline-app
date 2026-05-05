const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Remove ALL conditional tags first
xml = xml.replace(/\{#([^}]*)\}|\{\/([^}]*)\}/g, '');

// 2. Clean split tags
xml = xml.replace(/\{([^}]*)\}/g, (match) => {
    return match.replace(/<\/w:t>.*?<w:t>/g, '');
});

// 3. Sequential mapping for companyName
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
let cIdx = 0;
xml = xml.replace(/\{companyName\}/g, () => {
    if (cIdx < seq.length) {
        return `{worker_${seq[cIdx++]}_companyName}`;
    }
    return '{companyName}';
});

// 4. Replace literal "0" placeholders with tags
let zeroIdx = 7;
xml = xml.replace(/<w:t>0<\/w:t>/g, (match) => {
    if (zeroIdx < 14) {
        return `<w:t>{worker_${zeroIdx++}_name}( {%worker_${zeroIdx-1}_signature} )</w:t>`;
    }
    return match;
});

// 5. Wrap EVERYTHING in conditional blocks
for (let i = 0; i < 16; i++) {
    const nameTag = `{worker_${i}_name}`;
    const signTag = `{%worker_${i}_signature}`;
    
    let nIdx = 0;
    while ((nIdx = xml.indexOf(nameTag, nIdx)) !== -1) {
        const sIdx = xml.indexOf(signTag, nIdx);
        if (sIdx !== -1 && sIdx < nIdx + 1000) {
            const pIdx = xml.indexOf(')', sIdx);
            if (pIdx !== -1 && pIdx < sIdx + 100) {
                const before = xml.substring(0, nIdx);
                const between = xml.substring(nIdx, pIdx + 1);
                const after = xml.substring(pIdx + 1);
                xml = before + `{#worker_${i}_name}` + between + `{/worker_${i}_name}` + after;
                nIdx = pIdx + 1 + 30;
            } else {
                xml = xml.substring(0, nIdx) + `{#worker_${i}_name}` + nameTag + `{/worker_${i}_name}` + xml.substring(nIdx + nameTag.length);
                nIdx += 30;
            }
        } else {
            xml = xml.substring(0, nIdx) + `{#worker_${i}_name}` + nameTag + `{/worker_${i}_name}` + xml.substring(nIdx + nameTag.length);
            nIdx += 30;
        }
    }
}

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Deep cleaned and patched tbm.docx including 0 placeholders');
