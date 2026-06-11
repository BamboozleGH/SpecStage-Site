// Quick visual check of the topbar at a few widths.
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

app.commandLine.appendSwitch('force-device-scale-factor', '1');

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
  srv.listen(8128, async () => {
    const win = new BrowserWindow({ show: false, width: 1280, height: 120, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
    for (const w of [1280, 760, 390]) {
      win.setContentSize(w, 110);
      await win.loadURL('http://localhost:8128/');
      await win.webContents.executeJavaScript('new Promise(r => setTimeout(r, 500))');
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, `_topbar-${w}.png`), img.toPNG());
      console.log('topbar', w, 'captured');
    }
    win.destroy(); srv.close(); app.quit();
  });
}).catch((err) => { console.error(err); app.exit(1); });
