// Records each lines/*.txt into voice/*.mp3 with Microsoft Edge's online Kenyan male voice.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const WebSocket = require('ws');
const VOICE = process.argv[2] || 'en-KE-ChilembaNeural', RATE = process.argv[3] || '-6%';
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VERSIONS = ['143.0.3650.75','140.0.3485.54','130.0.2849.68']; let vi = 0, skew = 0; let CHROMIUM = VERSIONS[0];
function gec(){ let t = (Date.now()+skew)/1000 + 11644473600; t -= t % 300; t *= 1e7;
  return crypto.createHash('sha256').update(t.toFixed(0) + TOKEN, 'ascii').digest('hex').toUpperCase(); }
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function synth(text){ return new Promise((res, rej) => {
  const id = crypto.randomUUID().replace(/-/g,'');
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gec()}&Sec-MS-GEC-Version=1-${CHROMIUM}&ConnectionId=${id}`;
  const ws = new WebSocket(url, { headers: { 'Pragma':'no-cache','Cache-Control':'no-cache',
    'Origin':'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    'User-Agent':`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM.split('.')[0]}.0.0.0`,
    'Accept-Encoding':'gzip, deflate, br','Accept-Language':'en-US,en;q=0.9',
    'Cookie':'muid=' + crypto.randomBytes(16).toString('hex').toUpperCase() + ';' } });
  const chunks = []; const ts = new Date().toString();
  ws.on('open', () => {
    ws.send(`X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      JSON.stringify({context:{synthesis:{audio:{metadataoptions:{sentenceBoundaryEnabled:'false',wordBoundaryEnabled:'false'},outputFormat:'audio-24khz-48kbitrate-mono-mp3'}}}}));
    ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n` +
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${VOICE}'><prosody pitch='+0Hz' rate='${RATE}' volume='+0%'>${esc(text)}</prosody></voice></speak>`);
  });
  ws.on('message', (data, isBinary) => {
    if (isBinary) { const hl = data.readUInt16BE(0); const head = data.subarray(2, 2+hl).toString();
      if (head.includes('Path:audio')) chunks.push(data.subarray(2+hl)); }
    else if (data.toString().includes('Path:turn.end')) { ws.close(); res(Buffer.concat(chunks)); }
  });
  ws.on('error', rej); ws.on('unexpected-response', (q, r) => { const d = r.headers['date'];
    if (d) { const ns = new Date(d).getTime() - Date.now(); if (Math.abs(ns) > 60000) skew = ns; }
    console.log('  status', r.statusCode, 'server date', d, 'skew(ms)', skew, 'version', CHROMIUM);
    vi = (vi + 1) % VERSIONS.length; CHROMIUM = VERSIONS[vi]; rej(new Error('HTTP ' + r.statusCode)); });
});}
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
fs.mkdirSync(path.join(dir,'voice'), {recursive:true});
for (const f of fs.readdirSync(path.join(dir,'lines')).filter(f=>f.endsWith('.txt')).sort()) {
  const text = fs.readFileSync(path.join(dir,'lines',f),'utf8').trim();
  for (let tryN=1; ; tryN++) { try { const buf = await synth(text); if(!buf.length) throw new Error('empty audio');
      fs.writeFileSync(path.join(dir,'voice',f.replace('.txt','.mp3')), buf); console.log('OK', f, buf.length); break; }
    catch(e){ console.log('FAIL', f, e.message); if(tryN>=6) process.exit(1); } }
}
console.log('ALL DONE');
