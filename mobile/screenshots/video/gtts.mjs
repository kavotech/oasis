// Records lines/*.txt -> voice3/*.mp3 using Google's natural online voice (Nigerian-English accent).
import fs from 'node:fs'; import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const out = path.join(dir,'voice3'); fs.mkdirSync(out,{recursive:true});
const TLD = process.argv[2] || 'com.ng';
function chunks(t){ const parts=[]; let cur='';
  for (const w of t.replace(/\s+/g,' ').split(/(?<=[.,!?;])\s+/)) {
    if ((cur+' '+w).trim().length > 180 && cur) { parts.push(cur.trim()); cur=w; } else cur=(cur+' '+w).trim(); }
  if (cur) parts.push(cur); return parts; }
for (const f of fs.readdirSync(path.join(dir,'lines')).filter(f=>f.endsWith('.txt')).sort()) {
  const text = fs.readFileSync(path.join(dir,'lines',f),'utf8').trim(); const bufs=[];
  for (const c of chunks(text)) {
    const url = `https://translate.google.${TLD}/translate_tts?ie=UTF-8&client=tw-ob&tl=en&ttsspeed=1&q=${encodeURIComponent(c)}`;
    const r = await fetch(url, { headers: { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Referer':`https://translate.google.${TLD}/` } });
    if (!r.ok) { console.log('FAIL', f, r.status); process.exit(1); }
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  const b = Buffer.concat(bufs); fs.writeFileSync(path.join(out, f.replace('.txt','.mp3')), b); console.log('OK', f, b.length);
}
console.log('ALL DONE');
