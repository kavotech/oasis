// Records lines/*.txt -> voice/*.mp3 using maintained Edge TTS libraries (tries several).
import fs from 'node:fs'; import path from 'node:path';
const VOICE = 'en-KE-ChilembaNeural', RATE = '-6%';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
fs.mkdirSync(path.join(dir,'voice2'), {recursive:true});

async function viaUniversal(text){
  const m = await import('edge-tts-universal');
  const tts = new m.EdgeTTS(text, VOICE, { rate: RATE });
  const r = await tts.synthesize();
  return Buffer.from(await r.audio.arrayBuffer());
}
async function viaMsEdge(text){
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const out = tts.toStream(text, { rate: RATE });
  const stream = out.audioStream || out;
  const chunks = [];
  await new Promise((res, rej) => { stream.on('data', c => chunks.push(c)); stream.on('end', res); stream.on('close', res); stream.on('error', rej); });
  tts.close?.();
  return Buffer.concat(chunks);
}
const engines = [['edge-tts-universal', viaUniversal], ['msedge-tts', viaMsEdge]];
let good = null;
for (const f of fs.readdirSync(path.join(dir,'lines')).filter(f=>f.endsWith('.txt')).sort()) {
  const text = fs.readFileSync(path.join(dir,'lines',f),'utf8').trim();
  let done = false;
  for (const [name, fn] of (good ? [good] : engines)) {
    for (let t = 1; t <= 2 && !done; t++) {
      try { const buf = await fn(text); if (buf.length < 1000) throw new Error('audio too small: ' + buf.length);
        fs.writeFileSync(path.join(dir,'voice2',f.replace('.txt','.mp3')), buf);
        console.log('OK', f, name, buf.length); good = [name, fn]; done = true; }
      catch (e) { console.log('FAIL', f, name, String(e && (e.stack || e.message || e)).split('\n').slice(0,3).join(' | ')); }
    }
    if (done) break;
  }
  if (!done) { console.log('GIVING UP'); process.exit(1); }
}
console.log('ALL DONE');
