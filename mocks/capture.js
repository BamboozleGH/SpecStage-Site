// Renders the mock HTML files to 2x PNGs using Electron (run from the
// SpecStage product repo, which has electron installed):
//   cd C:\Users\Thoma\SpecStage
//   $env:ELECTRON_RUN_AS_NODE=$null; npx electron ..\specstage-site\mocks\capture.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Render at 2x device pixels while keeping windows at logical size, so
// nothing gets clamped to the physical screen.
app.commandLine.appendSwitch('force-device-scale-factor', '2');

const jobs = [
  { file: 'view-spec-mock.html',      out: 'view-spec.png',      w: 1456, h: 900 },
  { file: 'coverage-audit-mock.html', out: 'coverage-audit.png', w: 982 },
];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1456,
    height: 900,
    frame: false,
    useContentSize: true,
  });
  for (const j of jobs) {
    win.setContentSize(j.w, j.h || 600);
    await win.loadFile(path.join(__dirname, j.file));
    const contentH = j.h || await win.webContents.executeJavaScript('document.body.scrollHeight');
    win.setContentSize(j.w, contentH);
    await win.webContents.executeJavaScript('new Promise(r => setTimeout(r, 600));');
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, '..', j.out), img.toPNG());
    console.log('wrote', j.out, img.getSize());
  }
  win.destroy();
  app.quit();
}).catch((err) => { console.error(err); app.exit(1); });
