// Objective mobile-compliance check: loads every page at a narrow
// viewport and reports horizontal overflow plus any element wider
// than the viewport.
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const pages = ['/', '/how-it-works', '/about', '/faq', '/request-access', '/beta-terms', '/privacy'];
const widths = [390, 360, 320];

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
  srv.listen(8131, async () => {
    const win = new BrowserWindow({ show: false, width: 390, height: 800, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
    let failures = 0;
    for (const w of widths) {
      win.setContentSize(w, 800);
      for (const pg of pages) {
        await win.loadURL('http://localhost:8131' + pg);
        await win.webContents.executeJavaScript('new Promise(r => setTimeout(r, 700))');
        const r = await win.webContents.executeJavaScript(`(() => {
          const vw = document.documentElement.clientWidth;
          const overflowPx = document.documentElement.scrollWidth - vw;
          const wide = [];
          document.querySelectorAll('body *').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > vw + 1 || rect.right > vw + 1 || rect.left < -1) {
              if (el.id === 'cookie-banner' || el.closest('#cookie-banner') || el.classList.contains('hp')) return;
              wide.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0,2).join('.') : '') + ' w=' + Math.round(rect.width) + ' r=' + Math.round(rect.right));
            }
          });
          return { vw, overflowPx, wide: wide.slice(0, 6) };
        })()`);
        if (r.overflowPx > 1 || r.wide.length) {
          failures++;
          console.log('FAIL', w + 'px', pg, 'overflow=' + r.overflowPx, r.wide);
        } else {
          console.log('ok  ', w + 'px', pg);
        }
      }
    }
    console.log(failures ? failures + ' FAILURES' : 'ALL PAGES CLEAN at ' + widths.join('/') + 'px');
    win.destroy(); srv.close(); app.quit();
  });
}).catch((err) => { console.error(err); app.exit(1); });
