const fs = require('fs');
const PizZip = require('pizzip');

try {
  const filePath = 'public/templates/railway.docx';
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();
  
  // The string might have different XML tags between characters like `00:20 <w:r>~</w:r> 03:30`
  // We can just find 00:20 ~ 03:30 literally if they are in one run.
  // Wait, let's use a regex that matches 00:20 .*? 03:30 across tags, but it's risky.
  // Let's first check if '00:20 ~ 03:30' exists verbatim.
  if (xml.includes('00:20 ~ 03:30')) {
    xml = xml.replace(/00:20 ~ 03:30/g, '{workTime}');
    console.log('Replaced literal 00:20 ~ 03:30');
  } else {
    // Maybe tildes are spaced out, or different characters.
    // Let's replace 00:20.*03:30.
    const match = xml.match(/00:20[\s\S]*?03:30/);
    if (match) {
      xml = xml.replace(/00:20[\s\S]*?03:30/g, '{workTime}');
      console.log('Replaced matched regex 00:20...03:30');
    } else {
      console.log('Could not find work time string in XML.');
    }
  }

  zip.file('word/document.xml', xml);
  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
  console.log('Successfully patched work time in railway.docx');
} catch (e) {
  console.error(e);
}
