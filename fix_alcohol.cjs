const fs = require('fs');
const PizZip = require('pizzip');

try {
  const filePath = 'public/templates/alcohol.docx';
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();
  
  // 1. Replace {date} with {worker_X_date}
  let dateIndex = 0;
  xml = xml.replace(/\{date\}/g, (match) => {
    // If we only have 10 rows, we use index 0 to 9.
    // If there are more {date} tags (e.g. in the title), we should be careful.
    // Usually the table has 10 rows. Let's assume the first few might be in the header?
    // Actually the user screenshot shows the date column has 2026-05-04.
    // Let's replace sequentially.
    const repl = `{worker_${dateIndex}_date}`;
    dateIndex++;
    return repl;
  });

  // 2. Replace {%worker_0_signature} with {%worker_X_manager_signature}
  // Wait! {%worker_0_signature} might also be used in the '성명/서명' column for the manager himself!
  // In the screenshot, worker_0 (manager) has a signature in the 3rd column? No, there is no 3rd column signature, just a handwritten name!
  // Let's replace all {%worker_0_signature} sequentially.
  let sigIndex = 0;
  xml = xml.replace(/\{%worker_0_signature\}/g, (match) => {
    // Actually wait! The first row's confirmer IS worker 0's manager signature (which is worker 0 signature).
    // So if I replace all with {%worker_i_manager_signature}, it will work perfectly!
    const repl = `{%worker_${sigIndex}_manager_signature}`;
    sigIndex++;
    return repl;
  });

  zip.file('word/document.xml', xml);
  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
  
  console.log(`Successfully patched alcohol.docx. Replaced {date}: ${dateIndex}, Replaced {%worker_0_signature}: ${sigIndex}`);
} catch (e) {
  console.error(e);
}
