import { chromium } from 'playwright'

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1200px; height:630px;
    background:#0C0A09; color:#EDE8E3;
    font-family:Inter, system-ui, sans-serif;
    padding:88px; display:flex; flex-direction:column; justify-content:center;
    position:relative; overflow:hidden;
  }
  .glow {
    position:absolute; top:-220px; left:50%; transform:translateX(-50%);
    width:820px; height:620px; border-radius:50%;
    background:radial-gradient(circle, rgba(200,149,108,0.30) 0%, rgba(200,149,108,0) 68%);
  }
  .kicker { color:#C8956C; font-size:22px; letter-spacing:.24em; text-transform:uppercase; font-weight:500; margin-bottom:28px; }
  h1 { font-family:'DM Serif Display', Georgia, serif; font-size:132px; line-height:.94; margin-bottom:30px; }
  p { color:#9A8F85; font-size:31px; line-height:1.45; max-width:820px; }
  .chips { display:flex; gap:12px; margin-top:44px; }
  .chip { border:1px solid #2A2520; background:rgba(200,149,108,0.12); color:#9A8F85;
          border-radius:999px; padding:10px 22px; font-size:20px; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="kicker">Hello, I'm</div>
  <h1>Issac Ip</h1>
  <p>CS + Economics at Northeastern University.</p>
  <div class="chips">
    <span class="chip">Projects</span>
    <span class="chip">Photography</span>
    <span class="chip">Music</span>
  </div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html, { waitUntil: 'load' })
await page.waitForTimeout(1800)
await page.screenshot({ path: 'public/og.png' })
await browser.close()
console.log('wrote public/og.png')
