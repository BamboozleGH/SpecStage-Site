// Mobile review harness: serves the site directory, renders pages at
// 390px logical width in an OFFSCREEN window sized to the full page
// height, and captures one tall PNG per page into mocks/_mobile/.
//   cd C:\Users\Thoma\SpecStage
//   $env:ELECTRON_RUN_AS_NODE=$null; npx electron ..\specstage-site\mocks\mobile-check.js
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, '_mobile');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const pages = [
  { url: '/', name: 'index' },
  { url: '/how-it-works', name: 'hiw' },
  { url: '/request-access', name: 'apply' },
  { url: '/about', name: 'about' },
  { url: '/faq', name: 'faq' },
  { url: '/beta-terms', name: 'terms' },
];

app.whenReady().then(() => {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  srv.listen(8126, async () => {
    const win = new BrowserWindow({
      show: false,
      width: 390, height: 800,
      frame: false, useContentSize: true,
      webPreferences: { offscreen: true },
    });
    win.webContents.setFrameRate(10);
    for (const pg of pages) {
      await win.loadURL('http://localhost:8126' + pg.url);
      const total = await win.webContents.executeJavaScript('document.body.scrollHeight');
      win.setContentSize(390, Math.min(total, 16000));
      // everything is in-viewport now, so all reveals fire; let them finish
      await win.webContents.executeJavaScript('new Promise(r => setTimeout(r, 1600))');
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, `${pg.name}.png`), img.toPNG());
      console.log(pg.name, 'captured', img.getSize());
    }
    win.destroy();
    srv.close();
    app.quit();
  });
}).catch((err) => { console.error(err); app.exit(1); });
