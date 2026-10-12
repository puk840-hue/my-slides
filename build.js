// 슬라이드 묶기: node build.js
// slides/ 폴더의 "두 자리 번호-이름.html" 파일을 번호 순으로 읽어 index.html 한 장으로 묶는다.
// 슬라이드 안의 {{title}} {{subtitle}} {{presenter}} {{date}} {{page}} {{total}} 은 값으로 바뀐다.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const slidesDir = path.join(root, 'slides');
const config = JSON.parse(fs.readFileSync(path.join(root, 'deck.config.json'), 'utf8'));

const files = fs.readdirSync(slidesDir)
  .filter((f) => /^\d{2}-.+\.html$/.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (files.length === 0) {
  console.error('slides 폴더에 01-이름.html 형식의 슬라이드가 없습니다.');
  process.exit(1);
}

const fill = (text, vars) =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const slides = files.map((file, i) => {
  const raw = fs.readFileSync(path.join(slidesDir, file), 'utf8');
  const html = fill(raw, { ...config, page: i + 1, total: files.length });
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : file.replace(/^\d{2}-|\.html$/g, '');
  return { file, title, html };
});

// <script> 안에 안전하게 넣기 위해 '<' 를 이스케이프한다.
const slidesJson = JSON.stringify(slides.map(({ title, html }) => ({ title, html })))
  .replace(/</g, '\\u003c')
  .replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));

const pageTitle = [config.title, config.subtitle].filter(Boolean).join(' - ');

const index = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<!-- 이 파일은 build.js 가 만듭니다. 직접 고치지 말고 slides/ 를 고친 뒤 node build.js 를 실행하세요. -->
<style>
  :root { --bg:#1f1e1c; --bar:#2b2a27; --fg:#f4efe6; --muted:#a59f93; --accent:#e07a5f; --panel:#fbf7ef; --panel-ink:#2b2a27; }
  * { box-sizing:border-box; }
  html, body { margin:0; height:100%; }
  body { background:var(--bg); color:var(--fg); font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif; display:flex; flex-direction:column; overflow:hidden; }
  #stage { flex:1; position:relative; overflow:hidden; }
  #frame { position:absolute; left:50%; top:50%; width:1280px; height:720px; transform-origin:center; box-shadow:0 10px 40px rgba(0,0,0,.4); }
  #frame iframe { position:absolute; inset:0; width:1280px; height:720px; border:0; background:#fff; pointer-events:none; visibility:hidden; }
  #frame iframe.on { visibility:visible; }
  .nav { position:absolute; top:50%; transform:translateY(-50%); width:56px; height:56px; border-radius:50%; border:0; background:rgba(255,255,255,.12); color:var(--fg); font-size:26px; cursor:pointer; }
  .nav:hover { background:rgba(255,255,255,.25); }
  .nav:disabled { opacity:.25; cursor:default; }
  #prev { left:12px; } #next { right:12px; }
  body.fs .nav { opacity:0; } body.fs .nav:hover { opacity:1; }
  #bar { display:flex; align-items:center; gap:8px; padding:10px 16px; background:var(--bar); font-size:15px; }
  #bar .title { flex:1; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #bar button { background:transparent; color:var(--fg); border:1px solid #4a4741; border-radius:8px; padding:7px 14px; font:inherit; cursor:pointer; }
  #bar button:hover { border-color:var(--accent); color:var(--accent); }
  #counter { min-width:64px; text-align:center; font-variant-numeric:tabular-nums; }
  .modal { position:fixed; inset:0; background:rgba(0,0,0,.55); display:none; align-items:center; justify-content:center; z-index:10; }
  .modal.open { display:flex; }
  .panel { background:var(--panel); color:var(--panel-ink); border-radius:16px; padding:28px; max-width:min(520px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; }
  .panel h2 { margin:0 0 16px; font-size:22px; }
  #toc ol { margin:0; padding:0; list-style:none; }
  #toc li button { width:100%; text-align:left; background:none; border:0; border-radius:8px; padding:10px 12px; font:inherit; font-size:18px; color:inherit; cursor:pointer; display:flex; gap:12px; }
  #toc li button:hover { background:#efe7d8; }
  #toc li button.current { background:#f3d9cf; font-weight:700; }
  #toc li .n { color:#c8553d; font-variant-numeric:tabular-nums; }
  #qr .panel { text-align:center; }
  #qrcode svg { width:min(320px, 70vw); height:auto; display:block; margin:0 auto; }
  #qrurl { margin-top:12px; font-size:13px; color:#6f6a60; word-break:break-all; }
  .hint { margin-top:14px; font-size:13px; color:#6f6a60; }
  body.fs #bar { display:none; }
</style>
</head>
<body>
<div id="stage">
  <div id="frame"></div>
  <button class="nav" id="prev" aria-label="이전 슬라이드">‹</button>
  <button class="nav" id="next" aria-label="다음 슬라이드">›</button>
</div>
<div id="bar">
  <span class="title">${escapeHtml(pageTitle)}</span>
  <span id="counter"></span>
  <button id="btn-toc">목차</button>
  <button id="btn-qr">QR</button>
  <button id="btn-fs">전체화면</button>
</div>

<div class="modal" id="toc"><div class="panel"><h2>목차</h2><ol></ol></div></div>
<div class="modal" id="qr"><div class="panel"><h2>이 발표 페이지 주소</h2><div id="qrcode"></div><div id="qrurl"></div><div class="hint">휴대폰 카메라로 찍으면 이 페이지가 열립니다.</div></div></div>

<script src="vendor/qrcode.js"></script>
<script>
const SLIDES = ${slidesJson};

const frame = document.getElementById('frame');
const counter = document.getElementById('counter');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const tocList = document.querySelector('#toc ol');

const frames = SLIDES.map((s, i) => {
  const f = document.createElement('iframe');
  f.title = s.title;
  f.setAttribute('tabindex', '-1');
  f.srcdoc = s.html;
  frame.appendChild(f);
  return f;
});

SLIDES.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.innerHTML = '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span></span>';
  b.lastChild.textContent = s.title;
  b.onclick = () => { go(i); closeModals(); };
  li.appendChild(b);
  tocList.appendChild(li);
});

let current = 0;
function go(i) {
  current = Math.max(0, Math.min(SLIDES.length - 1, i));
  frames.forEach((f, k) => f.classList.toggle('on', k === current));
  tocList.querySelectorAll('button').forEach((b, k) => b.classList.toggle('current', k === current));
  counter.textContent = (current + 1) + ' / ' + SLIDES.length;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === SLIDES.length - 1;
  history.replaceState(null, '', '#' + (current + 1));
}

function fit() {
  const stage = document.getElementById('stage');
  const pad = document.fullscreenElement ? 0 : 144; // 일반 화면에서는 좌우 화살표 자리를 비워 둔다
  const s = Math.min((stage.clientWidth - pad) / 1280, (stage.clientHeight - 32) / 720);
  frame.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
}

function closeModals() { document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open')); }
function toggleModal(id) {
  const m = document.getElementById(id);
  const wasOpen = m.classList.contains('open');
  closeModals();
  if (!wasOpen) m.classList.add('open');
}

function showQR() {
  const url = location.href;
  const qr = qrcode(0, 'M');
  qr.addData(url, 'Byte');
  qr.make();
  document.getElementById('qrcode').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  document.getElementById('qrurl').textContent = url;
  toggleModal('qr');
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
prevBtn.onclick = () => go(current - 1);
nextBtn.onclick = () => go(current + 1);
document.getElementById('btn-toc').onclick = () => toggleModal('toc');
document.getElementById('btn-qr').onclick = showQR;
document.getElementById('btn-fs').onclick = toggleFullscreen;
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModals(); }));
document.addEventListener('fullscreenchange', () => { document.body.classList.toggle('fs', !!document.fullscreenElement); fit(); });
window.addEventListener('resize', fit);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeModals();
  if (document.querySelector('.modal.open')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(current + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(current - 1); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(SLIDES.length - 1);
  else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});

const start = parseInt(location.hash.slice(1), 10);
go(Number.isFinite(start) ? start - 1 : 0);
fit();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), index);
console.log('index.html 생성 완료 (' + slides.length + '장)');
slides.forEach((s, i) => console.log('  ' + String(i + 1).padStart(2, '0') + '. ' + s.title + '  <- slides/' + s.file));
