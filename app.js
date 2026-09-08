const http = require('node:http');
const { execFile } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number.parseInt(process.env.PORT || '20128', 10);
const ROUTER_URL = process.env.ROUTER_URL || 'http://127.0.0.1:20130/';
const BOT_SERVICE = process.env.BOT_SERVICE || 'something-ai.service';

const page = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Service Status</title>
  <style>
    :root{color-scheme:dark;--muted:#8fa3bd;--line:#22344d;--green:#36d399;--red:#fb7185;--yellow:#fbbf24}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:40px 24px;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at top,#142a47 0,#07111f 48%);color:#eef6ff}
    main{width:min(820px,100%);margin:auto}.eyebrow{color:#69a9ff;font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}h1{margin:8px 0 24px;font-size:clamp(2rem,7vw,3.4rem);line-height:1}
    .services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{padding:26px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,#14263ff5,#0a1727f5);box-shadow:0 24px 70px #0006}
    .title{margin:0 0 18px;font-size:1rem;color:#b9c9dc}.status-row{display:flex;align-items:center;gap:16px;margin-bottom:24px}.dot{width:18px;height:18px;flex:none;border-radius:50%;background:var(--yellow);box-shadow:0 0 0 7px #fbbf241f}.online .dot{background:var(--green);box-shadow:0 0 0 7px #36d3991f,0 0 24px #36d3998c}.offline .dot{background:var(--red);box-shadow:0 0 0 7px #fb71851f}.label{margin:0;font-size:1.45rem;font-weight:850}.detail{margin:4px 0 0;color:var(--muted);font-size:.9rem}
    .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:13px;border:1px solid var(--line);border-radius:13px;background:#040d1961}.metric span{display:block;color:var(--muted);font-size:.72rem;margin-bottom:6px}.metric strong{font-size:.92rem}footer{padding:18px 4px 0;color:var(--muted);font-size:.8rem;text-align:center}
    @media(max-width:680px){body{padding:28px 18px}.services{grid-template-columns:1fr}.card{padding:22px}}
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Live service monitor</div>
  <h1>Server Status</h1>
  <div class="services">
    <section class="card" id="router-card">
      <h2 class="title">9Router</h2><div class="status-row"><div class="dot"></div><div><p class="label">CHECKING...</p><p class="detail">Menghubungi 9Router</p></div></div>
      <div class="metrics"><div class="metric"><span>HTTP</span><strong class="http">—</strong></div><div class="metric"><span>Latency</span><strong class="latency">—</strong></div></div>
    </section>
    <section class="card" id="bot-card">
      <h2 class="title">Discord Bot · Asisten AI</h2><div class="status-row"><div class="dot"></div><div><p class="label">CHECKING...</p><p class="detail">Memeriksa service bot</p></div></div>
      <div class="metrics"><div class="metric"><span>Service</span><strong class="service">—</strong></div><div class="metric"><span>Process</span><strong class="process">—</strong></div></div>
    </section>
  </div>
  <footer>Status diperbarui otomatis setiap 5 detik · Terakhir: <span id="checked">—</span></footer>
</main>
<script>
function renderCard(id,online,detail){const c=document.querySelector(id);c.className='card '+(online?'online':'offline');c.querySelector('.label').textContent=online?'ONLINE':'OFFLINE';c.querySelector('.detail').textContent=detail}
async function update(){try{const r=await fetch('/api/status',{cache:'no-store'}),s=await r.json();renderCard('#router-card',s.router.online,s.router.online?'9Router merespons dengan normal':'9Router tidak dapat dijangkau');const rc=document.querySelector('#router-card');rc.querySelector('.http').textContent=s.router.httpStatus||'No response';rc.querySelector('.latency').textContent=s.router.latencyMs==null?'—':s.router.latencyMs+' ms';renderCard('#bot-card',s.bot.online,s.bot.online?'Bot terhubung dan service aktif':'Service bot tidak aktif');const bc=document.querySelector('#bot-card');bc.querySelector('.service').textContent=s.bot.state;bc.querySelector('.process').textContent=s.bot.online?'Running':'Stopped';document.querySelector('#checked').textContent=new Date(s.checkedAt).toLocaleTimeString('id-ID')}catch(e){renderCard('#router-card',false,'Dashboard gagal mengambil status');renderCard('#bot-card',false,'Dashboard gagal mengambil status')}}
update();setInterval(update,5000);
</script>
</body></html>`;

async function routerStatus() {
  const started = performance.now();
  try {
    const response = await fetch(ROUTER_URL, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
    return { online: response.status >= 200 && response.status < 500, httpStatus: response.status, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { online: false, httpStatus: null, latencyMs: null };
  }
}

async function botStatus() {
  try {
    const { stdout } = await execFileAsync('/usr/bin/systemctl', ['is-active', BOT_SERVICE], { timeout: 2000 });
    const state = stdout.trim();
    return { online: state === 'active', state };
  } catch (error) {
    const state = String(error.stdout || '').trim() || 'inactive';
    return { online: false, state };
  }
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'"
};

http.createServer(async (req, res) => {
  if (req.url === '/api/status') {
    const [router, bot] = await Promise.all([routerStatus(), botStatus()]);
    res.writeHead(200, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ router, bot, checkedAt: new Date().toISOString() }));
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(page);
  }
  res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, HOST, () => console.log(`status dashboard listening on ${HOST}:${PORT}`));
