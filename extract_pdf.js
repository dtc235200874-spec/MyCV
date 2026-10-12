const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('d:/MyCV/cv_source.pdf');
const latin = buf.toString('latin1');

// ASCII85 decode
function ascii85Decode(data) {
  let str = data;
  // Remove surrounding whitespace
  str = str.trim();
  if (str.startsWith('<~')) str = str.slice(2);
  if (str.endsWith('~>')) str = str.slice(0, -2);
  const out = [];
  let tuple = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === 'z' && tuple.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (ch.match(/\s/)) continue;
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) continue;
    tuple.push(c);
    if (tuple.length === 5) {
      let v = 0;
      for (const t of tuple) v = v * 85 + t;
      out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
      tuple = [];
    }
  }
  if (tuple.length > 0) {
    const n = tuple.length;
    for (let i = n; i < 5; i++) tuple.push(84);
    let v = 0;
    for (const t of tuple) v = v * 85 + t;
    const bytes = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
    for (let i = 0; i < n - 1; i++) out.push(bytes[i]);
  }
  return Buffer.from(out);
}

// Build ToUnicode maps from CMap streams, then decode content strings
const bfcharMap = new Map(); // srcCodeHex -> unicodeHex
const bfrangeMap = [];
const cmapStreams = [];
const objRe = /(\d+)\s+0\s+obj([\s\S]*?)stream\r?\n/g;
let om;
const contents = [];
while ((om = objRe.exec(latin)) !== null) {
  const objNum = om[1];
  const dict = om[2];
  const start = om.index + om[0].length;
  const endIdx = latin.indexOf('endstream', start);
  if (endIdx === -1) continue;
  let streamBuf = Buffer.from(latin.slice(start, endIdx), 'latin1');
  const filters = [];
  const fMatch = dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/);
  if (fMatch) {
    const fstr = fMatch[1];
    const fm = fstr.match(/\/\w+/g);
    if (fm) fm.forEach(f => filters.push(f.slice(1)));
  }
  // PDF spec: decode filters in the SAME order they appear in the array
  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    if (f === 'FlateDecode') {
      try { streamBuf = zlib.inflateSync(streamBuf); }
      catch (e) { try { streamBuf = zlib.inflateRawSync(streamBuf); } catch (e2) { streamBuf = Buffer.alloc(0); } }
    } else if (f === 'ASCII85Decode') {
      streamBuf = ascii85Decode(streamBuf.toString('latin1'));
    } else {
      // Unknown filter -> skip this stream
      streamBuf = Buffer.alloc(0);
      break;
    }
  }
  const text = streamBuf.toString('latin1');
  if (text.includes('beginbfchar') || text.includes('beginbfrange') || text.includes('begincmap')) {
    cmapStreams.push(text);
  }
  if (text.includes('Tj') || text.includes('TJ') || text.includes('BT')) {
    contents.push(text);
  }
}

// Parse CMap bfchar and bfrange
for (const cm of cmapStreams) {
  let mm;
  const bfRe = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((mm = bfRe.exec(cm)) !== null) {
    const body = mm[1];
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = pairRe.exec(body)) !== null) {
      bfcharMap.set(parseInt(p[1], 16), parseInt(p[2], 16));
    }
  }
  const rangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((mm = rangeRe.exec(cm)) !== null) {
    const body = mm[1];
    // <lo> <hi> <dst>
    const triRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = triRe.exec(body)) !== null) {
      bfrangeMap.push({ lo: parseInt(p[1], 16), hi: parseInt(p[2], 16), dst: p[3] });
    }
  }
}
fs.writeFileSync('d:/MyCV/cmap_debug.txt',
  'bfchar entries: ' + bfcharMap.size + '\nbfrange entries: ' + bfrangeMap.length + '\n' +
  Array.from(bfcharMap.entries()).map(([k, v]) => k.toString(16) + ' -> ' + v.toString(16) + ' (' + String.fromCharCode(v) + ')').join('\n'),
  'utf8');

function extractText(content) {
  const results = [];
  let withNL = content
    .replace(/T\*/g, '\n')
    .replace(/[-\d.]+\s+[-\d.]+\s+(Td|TD)/g, '\n');
  const strRe = /\(((?:[^()\\]|\\.)*)\)/g;
  let sm;
  const tokens = [];
  let lastIndex = 0;
  while ((sm = strRe.exec(withNL)) !== null) {
    const between = withNL.slice(lastIndex, sm.index);
    const nlCount = (between.match(/\n/g) || []).length;
    for (let k = 0; k < nlCount; k++) tokens.push('\n');
    tokens.push(sm[1]);
    lastIndex = sm.index + sm[0].length;
  }
  let line = '';
  for (const t of tokens) {
    if (t === '\n') { results.push(line); line = ''; }
    else {
      let s = t.replace(/\\([()\\])/g, '$1').replace(/\\n/g, '').replace(/\\r/g, '').replace(/\\t/g, ' ');
      line += s;
    }
  }
  results.push(line);
  return results.join('\n');
}

let allLines = [];
for (const c of contents) allLines.push(extractText(c));
const final = allLines.join('\n=====SECTION=====\n').replace(/\n{3,}/g, '\n\n');
fs.writeFileSync('d:/MyCV/cv_extracted.txt', final, 'utf8');
console.log('CONTENT STREAMS FOUND:', contents.length);
console.log(final);

