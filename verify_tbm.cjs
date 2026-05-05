const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/tbm.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

const openTags = xml.match(/\{#([^}]*)\}/g) || [];
const closeTags = xml.match(/\{\/([^}]*)\}/g) || [];

console.log('Open tags count:', openTags.length);
console.log('Close tags count:', closeTags.length);

const openNames = openTags.map(t => t.slice(2, -1));
const closeNames = closeTags.map(t => t.slice(2, -1));

const unmatchedOpen = openNames.filter(n => !closeNames.includes(n));
const unmatchedClose = closeNames.filter(n => !openNames.includes(n));

if (unmatchedOpen.length > 0 || unmatchedClose.length > 0) {
    console.log('Unmatched Open:', unmatchedOpen);
    console.log('Unmatched Close:', unmatchedClose);
    process.exit(1);
} else {
    console.log('All tags are balanced perfectly!');
}
