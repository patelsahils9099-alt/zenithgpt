import JSZip from 'jszip';

const stripNs = (tag) => (tag.includes(':') ? tag.split(':')[1] : tag);

function textFromXmlByTag(xml, tagName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const all = doc.getElementsByTagName('*');
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const node = all[i];
    if (stripNs(node.tagName) === tagName) {
      out.push(node.textContent || '');
    }
  }
  return out;
}

export async function extractPptx(file) {
  const zip = await JSZip.loadAsync(file);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });
  const slides = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.file(slideNames[i]).async('string');
    const parts = textFromXmlByTag(xml, 't');
    const text = parts.map((s) => s.trim()).filter(Boolean).join(' ');
    if (text) slides.push(`Slide ${i + 1}: ${text}`);
  }
  return slides.join('\n\n');
}

export async function extractDocx(file) {
  const zip = await JSZip.loadAsync(file);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('word/document.xml missing');
  const xml = await docFile.async('string');
  const paragraphs = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const pNodes = doc.getElementsByTagName('*');
  for (let i = 0; i < pNodes.length; i++) {
    const node = pNodes[i];
    if (stripNs(node.tagName) === 'p') {
      const tNodes = node.getElementsByTagName('*');
      const parts = [];
      for (let j = 0; j < tNodes.length; j++) {
        if (stripNs(tNodes[j].tagName) === 't') parts.push(tNodes[j].textContent || '');
      }
      const para = parts.join('').trim();
      if (para) paragraphs.push(para);
    }
  }
  return paragraphs.join('\n\n');
}

export async function extractAny(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pptx') return extractPptx(file);
  if (ext === 'docx') return extractDocx(file);
  return null;
}
