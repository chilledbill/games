// Martial Idler - taskbar overlay (Electron).
// A transparent, frameless, always-on-top strip along the bottom of your screen, just above the taskbar.
// Hero fights on his own; the window is click-through so it never gets in the way of your work.
//
//   Ctrl+Alt+O  toggle interactive mode (click enemies, parry, open the upgrade panel from the full game)
//   Ctrl+Alt+Q  quit
const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');

const STRIP_HEIGHT = 320;   // px, the strip along the bottom of the work area
let win = null;
let interactive = false;

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;   // the area above the taskbar
  win = new BrowserWindow({
    x: wa.x, y: wa.y + wa.height - STRIP_HEIGHT, width: wa.width, height: STRIP_HEIGHT,
    transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, backgroundColor: '#00000000',
    webPreferences: { backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });   // click-through by default
  // ?overlay=1 makes the game skip its menu, hide the backdrop and run on Auto.
  win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { overlay: '1' } });
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register('CommandOrControl+Alt+O', () => {
    interactive = !interactive;
    win.setIgnoreMouseEvents(!interactive, { forward: true });
    win.setFocusable(interactive);
  });
  globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit());
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
