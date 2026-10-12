const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('d:/MyCV/cv_source.pdf');
const latin = buf.toString('latin1');

function ascii85Decode(data) {
  let str = data.trim();
  if (str.startsWith('<~')) str = str.slice(2);
  if (str.endsWith('~>')) str = str.slice(0, -2);
  const out = [];
  let tuple = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === 'z' && tuple.length === 0) { out.push(0, 0, 0, 0); continue; }
    if (/\s/.test(ch)) continue;
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) continue;
    tuple.push(c);
    if (tuple.length === 5) {
      let v = 0; for (const t of tuple) v = v * 85 + t;
      out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
      tuple = [];
    }
  }
  if (tuple.length > 0) {
    const n = tuple.length;
    for (let i = n; i < 5; i++) tuple.push(84);
    let v = 0; for (const t of tuple) v = v * 85 + t;
    const bytes = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
    for (let i = 0; i < n - 1; i++) out.push(bytes[i]);
  }
  return Buffer.from(out);
}

function parseObjects(str) {
  const objs = new Map();
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  const starts = [];
  while ((m = re.exec(str)) !== null) starts.push({ num: parseInt(m[1], 10), dictStart: m.index + m[0].length, headerIdx: m.index });
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const nextHeader = i + 1 < starts.length ? starts[i + 1].headerIdx : str.length;
    let endObjIdx = str.indexOf('endobj', s.dictStart);
    if (endObjIdx === -1 || endObjIdx > nextHeader) endObjIdx = nextHeader;
    const full = str.slice(s.dictStart, endObjIdx);
    const streamMatch = full.match(/stream\r?\n/);
    let dict = full;
    let streamBuf = null;
    if (streamMatch) {
      dict = full.slice(0, streamMatch.index);
      const streamStart = s.dictStart + streamMatch.index + streamMatch[0].length;
      let streamEnd = str.indexOf('endstream', streamStart);
      if (streamEnd === -1 || streamEnd > nextHeader + 20) streamEnd = endObjIdx;
      streamBuf = Buffer.from(str.slice(streamStart, streamEnd), 'latin1');
    }
    objs.set(s.num, { dict, streamBuf });
  }
  return objs;
}

function decodeStream(obj) {
  if (!obj.streamBuf) return null;
  let b = obj.streamBuf;
  const filters = [];
  const fMatch = obj.dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/);
  if (fMatch) {
    const fm = fMatch[1].match(/\/\w+/g);
    if (fm) fm.forEach(f => filters.push(f.slice(1)));
  }
  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    if (f === 'FlateDecode') {
      try { b = zlib.inflateSync(b); } catch (e) { try { b = zlib.inflateRawSync(b); } catch (e) { return Buffer.alloc(0); } }
    } else if (f === 'ASCII85Decode') {
      b = ascii85Decode(b.toString('latin1'));
    } else { return Buffer.alloc(0); }
  }
  return b;
}
//__PART2__


const objs = parseObjects(latin);

function parseCMap(text) {
  const map = new Map();
  let mm;
  const bfRe = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((mm = bfRe.exec(text)) !== null) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = pairRe.exec(mm[1])) !== null) map.set(parseInt(p[1], 16), parseInt(p[2], 16));
  }
  return map;
}

const objCMap = new Map();
for (const [num, obj] of objs) {
  if (!obj.streamBuf) continue;
  const dec = decodeStream(obj);
  if (!dec) continue;
  const t = dec.toString('latin1');
  if (t.includes('begincmap') && (t.includes('beginbfchar') || t.includes('beginbfrange'))) objCMap.set(num, parseCMap(t));
}

const fontNameToCMap = new Map();
for (const [num, obj] of objs) {
  if (!/\/Type\s*\/Font/.test(obj.dict)) continue;
  const nameMatch = obj.dict.match(/\/Name\s*\/([^\s/]+)/);
  const toMatch = obj.dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  if (nameMatch && toMatch) {
    const toObjNum = parseInt(toMatch[1], 10);
    if (objCMap.has(toObjNum)) fontNameToCMap.set('/' + nameMatch[1], objCMap.get(toObjNum));
  }
}

let contentText = null;
for (const [num, obj] of objs) {
  if (!obj.streamBuf) continue;
  const dec = decodeStream(obj);
  if (!dec) continue;
  const t = dec.toString('latin1');
  if (t.includes('BT') && (t.includes('Tj') || t.includes('TJ'))) { contentText = t; break; }
}

function decodeContent(content, fontMap, fallbackCMap) {
  const results = [];
  let cur = fallbackCMap;
  const lines = content.split('\n');
  for (let line of lines) {
    const tfRe = /\/([^\s/]+)\s+[\d.]+\s+Tf/g;
    let fm;
    while ((fm = tfRe.exec(line)) !== null) {
      const fn = '/' + fm[1];
      if (fontMap.has(fn)) cur = fontMap.get(fn);
    }
    const strRe = /\(((?:[^()\\]|\\.)*)\)/g;
    let sm;
    let out = '';
    while ((sm = strRe.exec(line)) !== null) {
      const inner = sm[1];
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '\\') {
          i++;
          const nx = inner[i];
          if (nx >= '0' && nx <= '7') {
            let oct = nx;
            for (let k = 0; k < 2; k++) {
              if (i + 1 < inner.length && inner[i + 1] >= '0' && inner[i + 1] <= '7') { oct += inner[i + 1]; i++; }
              else break;
            }
            const code = parseInt(oct, 8) & 0xff;
            out += (cur && cur.has(code)) ? String.fromCharCode(cur.get(code)) : String.fromCharCode(code);
            continue;
          }
          if (nx === 'n' || nx === 'r') { out += ' '; continue; }
          if (nx === 't') { out += ' '; continue; }
          out += nx; continue;
        }
        const code = inner.charCodeAt(i) & 0xff;
        out += (cur && cur.has(code)) ? String.fromCharCode(cur.get(code)) : String.fromCharCode(code);
      }
    }
    if (out.trim().length > 0) results.push(out);
  }
  return results.join('\n');
}

const fallback = objCMap.size ? Array.from(objCMap.values())[0] : null;
const final = decodeContent(contentText, fontNameToCMap, fallback);
fs.writeFileSync('d:/MyCV/cv_extracted.txt', final, 'utf8');
console.log('OK fonts=' + Array.from(fontNameToCMap.keys()).join(','));
