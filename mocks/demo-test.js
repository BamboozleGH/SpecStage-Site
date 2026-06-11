// Functional check of the interactive spec demo: serve the site, click
// a non-AI bracket option, assert classes + badge text change, click
// the AI option back, assert badge restores.
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

app.whenReady().then(() => {
  const srv = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  srv.listen(8127, async () => {
    const win = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { offscreen: true } });
    await win.loadURL('http://localhost:8127/');
    const result = await win.webContents.executeJavaScript(`(() => {
      const demo = document.querySelector('.spec-demo');
      const group = demo.querySelectorAll('.sd-group')[0];
      const opts = Array.from(group.querySelectorAll('.sd-opt'));
      const badge = demo.querySelector('.sd-badge-text');
      const out = {};
      out.roles = opts.every(o => o.getAttribute('role') === 'button' && o.tabIndex === 0);
      out.initialBadge = badge.textContent;
      // click the first (non-AI) option: "26"
      opts[0].click();
      out.afterClick = {
        clickedIsAdd: opts[0].classList.contains('sd-add'),
        aiIsDel: opts[2].classList.contains('sd-del'),
        demoLive: demo.classList.contains('demo-live'),
        badge: badge.textContent,
        ariaPressed: opts[0].getAttribute('aria-pressed'),
      };
      // click AI pick back
      opts[2].click();
      out.afterRestore = {
        aiIsAdd: opts[2].classList.contains('sd-add'),
        badge: badge.textContent,
      };
      return out;
    })()`);
    console.log(JSON.stringify(result, null, 2));
    win.destroy(); srv.close(); app.quit();
  });
}).catch((err) => { console.error(err); app.exit(1); });
