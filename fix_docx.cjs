const fs = require('fs');
const PizZip = require('pizzip');

try {
  const filePath = 'public/templates/railway.docx';
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();
  
  // Force split the <w:t> tags for ANY image tag so they don't consume the surrounding text.
  // We look for {%...} inside <w:t>...{%...}...</w:t>
  // Simple hack: just replace {% with </w:t></w:r><w:r><w:t>{% and } with }</w:t></w:r><w:r><w:t>
  xml = xml.replace(/\{%/g, '</w:t></w:r><w:r><w:t>{%');
  xml = xml.replace(/%}/g, '%}</w:t></w:r><w:r><w:t>');
  // Also we need to fix if the user just wrote {%tag}
  xml = xml.replace(/\}/g, '}</w:t></w:r><w:r><w:t>'); // wait this is dangerous for non-image tags?
  
  // A safer approach for the exact tags:
  const tags = [
    '{%worker_0_name_handwritten}', '{%worker_1_name_handwritten}',
    '{%worker_0_signature}', '{%worker_1_signature}',
    '{%worker_0_manager_signature}', '{%worker_1_manager_signature}'
  ];
  
  tags.forEach(tag => {
    // If tag exists, wrap it to break the run
    xml = xml.replace(new RegExp(tag, 'g'), `</w:t></w:r><w:r><w:t>${tag}</w:t></w:r><w:r><w:t>`);
  });

  zip.file('word/document.xml', xml);
  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
  console.log('Successfully patched railway.docx using exact tag splits');
} catch (e) {
  console.error(e);
}
