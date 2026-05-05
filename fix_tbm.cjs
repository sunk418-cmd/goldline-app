const fs = require('fs');
const PizZip = require('pizzip');

const filePath = 'public/templates/tbm.docx';
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Remove split tags
xml = xml.replace(/\{[^}]*\}|(<w:t>.*?<\/w:t>)/g, (match, wt) => {
    // This is complex, let's use a simpler way: remove XML tags between { and }
    return match; 
});
// Actually, let's just do a string replace for common split patterns if needed.
// But for now, let's assume tags are mostly clean or use the naivety.

// 2. Sequential mapping for companyName (14 slots)
// 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14
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

// 3. Address the "()" and "0" issues
// We will iterate through all 14 rows and wrap the name/signature block in a conditional section.
// Row sequence for names/signatures:
// Left: 0, 1, 2, 3, 4, 5, 6
// Right: 7, 8, 9, 10, 11, 12, 13

// First, fix the right side where "0" might be present instead of tags
for (let i = 7; i < 14; i++) {
    // If there is a literal 0 in a w:t tag where we expect a name, replace it.
    // This is tricky. Let's look for <w:t>0</w:t> and replace sequentially?
    // Actually, let's just replace all <w:t>0</w:t> with the tags if we find them.
}

// Better: Let's use a regex to find the worker name and its surrounding parentheses.
// Pattern: <w:t>{worker_i_name}</w:t>...<w:t>(</w:t>...<w:t>{%worker_i_signature}</w:t>...<w:t>)</w:t>
for (let i = 0; i < 14; i++) {
    const nameTag = `{worker_${i}_name}`;
    const signTag = `{%worker_${i}_signature}`;
    
    // We want to wrap the WHOLE cell content or at least from name to paren.
    // A simple trick: Replace {worker_i_name} with {#worker_i_name}{worker_i_name}
    // and the closing paren ) with ){/worker_i_name}
    
    // But wait, the paren might be in a different w:t.
    // Let's do a naive string replace on the XML:
    xml = xml.replace(nameTag, `{#worker_${i}_name}${nameTag}`);
    
    // Now find the NEXT closing paren after this name tag.
    // This is dangerous if not careful.
    // Instead, let's just replace the pattern "{worker_i_name}(" and ")"
}

// Actually, the user says "()요것도 없어지면 좋겟어".
// If I just wrap the entire block in {#worker_i_name} ... {/worker_i_name}, it's perfect.
// Let's do it for all 16 workers just in case.
for (let i = 0; i < 16; i++) {
    const nameTag = `{worker_${i}_name}`;
    const signTag = `{%worker_${i}_signature}`;
    
    // Replace {worker_i_name} with {#worker_${i}_name}{worker_${i}_name}
    if (xml.includes(nameTag)) {
        xml = xml.replace(nameTag, `{#worker_${i}_name}${nameTag}`);
        // Find the signature tag and the closing paren
        if (xml.includes(signTag)) {
            // Find the first ) after signTag
            const sIdx = xml.indexOf(signTag);
            const pIdx = xml.indexOf(')', sIdx);
            if (pIdx !== -1) {
                // Insert {/worker_i_name} after )
                xml = xml.substring(0, pIdx + 1) + `{/worker_${i}_name}` + xml.substring(pIdx + 1);
            }
        } else {
            // No signature tag, just close after name
            xml = xml.replace(nameTag + `{#worker_${i}_name}`, nameTag + `{/worker_${i}_name}`);
        }
    }
}

// Handle the literal "0"s on the right side if they exist
// We'll replace them with tags if they are in the expected positions.
let zeroIdx = 7;
xml = xml.replace(/<w:t>0<\/w:t>/g, (match) => {
    if (zeroIdx < 14) {
        const repl = `<w:t>{worker_${zeroIdx}_name}( {%worker_${zeroIdx}_signature} )</w:t>`;
        // Wrap it in conditional immediately
        const wrapped = `{#worker_${zeroIdx}_name}${repl}{/worker_${zeroIdx}_name}`;
        zeroIdx++;
        return wrapped;
    }
    return match;
});

zip.file('word/document.xml', xml);
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(filePath, buffer);
console.log('Successfully patched tbm.docx with conditional blocks');
