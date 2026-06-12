// Capture a desktop-width region of a page for visual review.
// Usage: npx electron section-check.js <path> <scrollY> <outName>
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const [, , pgPath = '/how-it-works', scrollY = '600', outName = '_section.png'] = process.argv;
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
  srv.listen(8129, async () => {
    const win = new BrowserWindow({ show: false, width: 1366, height: 900, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
    await win.loadURL('http://localhost:8129' + pgPath);
    await win.webContents.executeJavaScript(
      `document.documentElement.style.scrollBehavior='auto';
       window.scrollTo(0, ${scrollY});
       new Promise(r => setTimeout(r, 1200));`
    );
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, outName), img.toPNG());
    console.log('captured', outName);
    win.destroy(); srv.close(); app.quit();
  });
}).catch((err) => { console.error(err); app.exit(1); });
