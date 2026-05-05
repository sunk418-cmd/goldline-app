const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Clean ALL botched tags
xml = xml.replace(/\{#([^}]*)\}|\{\/([^}]*)\}/g, '');
xml = xml.replace(/\{worker_\d+_companyName\}/g, '{companyName}');
xml = xml.replace(/\{worker_\d+_open_paren\}|\{worker_\d+_close_paren\}/g, (match) => {
    return match.includes('open') ? '(' : ')';
});

// 2. Clean split tags
xml = xml.replace(/\{([^}]*)\}/g, (match) => {
    return match.replace(/<\/w:t>.*?<w:t>/g, '');
});

// 3. Sequential mapping for companyName (14 slots)
const seq = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
let cIdx = 0;
xml = xml.replace(/\{companyName\}/g, () => {
    if (cIdx < seq.length) return `{worker_${seq[cIdx++]}_companyName}`;
    return '{companyName}';
});

// 4. Map the literal "0" placeholders to tags
let zeroIdx = 7;
xml = xml.replace(/<w:t>0<\/w:t>/g, (match) => {
    if (zeroIdx < 14) {
        const i = zeroIdx++;
        return `<w:t>{worker_${i}_name}{worker_${i}_open_paren} {%worker_${i}_signature} {worker_${i}_close_paren}</w:t>`;
    }
    return match;
});

// 5. Replace parentheses with tags near worker tags
for (let i = 0; i < 16; i++) {
    const nameTag = `{worker_${i}_name}`;
    const signTag = `{%worker_${i}_signature}`;
    
    // Find nameTag, then find next ( and )
    let nIdx = 0;
    while ((nIdx = xml.indexOf(nameTag, nIdx)) !== -1) {
        // Find next ( after nameTag
        let openIdx = xml.indexOf('(', nIdx);
        if (openIdx !== -1 && openIdx < nIdx + 200) {
            xml = xml.substring(0, openIdx) + `{worker_${i}_open_paren}` + xml.substring(openIdx + 1);
            // Find next ) after the new tag
            let closeIdx = xml.indexOf(')', openIdx);
            if (closeIdx !== -1 && closeIdx < openIdx + 300) {
                xml = xml.substring(0, closeIdx) + `{worker_${i}_close_paren}` + xml.substring(closeIdx + 1);
            }
        }
        nIdx += 50;
    }
}

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Successfully applied parenthesis tags to tbm.docx');
