import { app, BrowserWindow, Menu, dialog, type MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'
import { initLogging, log, mark } from './logging'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './storage'
import { IPC_CHANNELS, broadcastSettings, registerIpc } from './ipc'
import { loadNotes, type NotesMap } from './notes'

let mainWindow: BrowserWindow | null = null
let settings: Settings = DEFAULT_SETTINGS
let notes: NotesMap = {}
let dataDir = ''

function dataRoot(): string {
  return app.getPath('userData')
}

function updateSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch, window: { ...settings.window } }
  saveSettings(dataDir, settings)
  broadcastSettings(mainWindow, settings)
  buildMenu()
}

function resetLayout(): void {
  updateSettings({ window: { ...DEFAULT_SETTINGS.window } })
}

function pushRecentCif(path: string): void {
  const next = [path, ...settings.recentCif.filter((p) => p !== path)].slice(0, 10)
  updateSettings({ recentCif: next })
}

async function pickExportPath(defaultName: string): Promise<string | null> {
  const win = mainWindow
  if (!win) return null
  const result = await dialog.showSaveDialog(win, {
    title: '导出笔记为 Markdown',
    defaultPath: defaultName,
    filters: [{ name: 'Markdown 文件', extensions: ['md'] }],
  })
  if (result.canceled || result.filePath.length === 0) return null
  return result.filePath
}

function showHelpTopic(topic: 'quickstart' | 'shortcuts'): void {
  mainWindow?.webContents.send(IPC_CHANNELS.showHelp, { topic })
}

function requestExportNotes(): void {
  mainWindow?.webContents.send('sw:storage:request-export-notes', {})
}

function requestOpenCif(path: string): void {
  mainWindow?.webContents.send('sw:cif:request-open', { path })
}

function openCifDialog(): void {
  const win = mainWindow
  if (!win) return
  void dialog
    .showOpenDialog(win, {
      title: '打开 CIF 文件',
      filters: [{ name: 'CIF 晶体结构文件', extensions: ['cif'] }],
      properties: ['openFile'],
    })
    .then((result) => {
      if (result.canceled || result.filePaths.length === 0) return
      requestOpenCif(result.filePaths[0] as string)
    })
}

function showAbout(): void {
  const win = mainWindow
  if (!win) return
  void dialog.showMessageBox(win, {
    type: 'info',
    title: '关于',
    message: 'solids-world',
    detail: `版本 ${app.getVersion()}\n开源可交互的固体物理与原子物理 3D 图鉴\n完全离线运行 · MIT 许可证`,
    buttons: ['确定'],
  })
}

function buildMenu(): void {
  const recentItems: MenuItemConstructorOptions[] =
    settings.recentCif.length > 0
      ? settings.recentCif.map((path) => ({
          label: path.length > 40 ? `…${path.slice(-39)}` : path,
          click: () => requestOpenCif(path),
        }))
      : [{ label: '（空）', enabled: false }]
  const toleranceItems: MenuItemConstructorOptions[] = [0.9, 1.0, 1.15, 1.3, 1.4].map((value) => ({
    label: value.toFixed(2),
    type: 'radio' as const,
    checked: Math.abs(settings.bondTolerance - value) < 1e-9,
    click: () => updateSettings({ bondTolerance: value }),
  }))
  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '打开 CIF…', accelerator: 'CmdOrCtrl+O', click: () => openCifDialog() },
        { label: '最近打开', submenu: recentItems },
        { type: 'separator' },
        {
          label: '导出笔记为 Markdown…',
          enabled: Object.keys(notes).length > 0,
          click: () => requestExportNotes(),
        },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: '查看',
      submenu: [
        {
          label: '主题',
          submenu: [
            { label: '跟随系统', type: 'radio', checked: settings.theme === 'system', click: () => updateSettings({ theme: 'system' }) },
            { label: '暗色', type: 'radio', checked: settings.theme === 'dark', click: () => updateSettings({ theme: 'dark' }) },
            { label: '浅色', type: 'radio', checked: settings.theme === 'light', click: () => updateSettings({ theme: 'light' }) },
          ],
        },
        {
          label: '语言',
          submenu: [
            { label: '中文', type: 'radio', checked: settings.locale === 'zh', click: () => updateSettings({ locale: 'zh' }) },
            { label: 'English', type: 'radio', checked: settings.locale === 'en', click: () => updateSettings({ locale: 'en' }) },
          ],
        },
        { type: 'separator' },
        {
          label: '后期效果（AO 与辉光）',
          type: 'checkbox',
          checked: settings.postfx,
          click: (item) => updateSettings({ postfx: item.checked }),
        },
        { label: 'CIF 键判定容差', submenu: toleranceItems },
        { type: 'separator' },
        { label: '重置界面', click: () => resetLayout() },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '快速上手', click: () => showHelpTopic('quickstart') },
        { label: '快捷键', click: () => showHelpTopic('shortcuts') },
        { type: 'separator' },
        { label: '关于', click: () => showAbout() },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: settings.window.width,
    height: settings.window.height,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#16222b',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mark('main:ready-to-show')
  })
  mainWindow.on('close', () => {
    const win = mainWindow
    if (win && !win.isMaximized() && !win.isFullScreen()) {
      const bounds = win.getBounds()
      settings.window.width = bounds.width
      settings.window.height = bounds.height
      saveSettings(dataDir, settings)
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
  mark('main:window-created')
}

if (!app.isPackaged) {
  app.setPath('userData', join(process.cwd(), '.electron-data'))
}

void app.whenReady().then(() => {
  dataDir = dataRoot()
  const logsRoot = app.isPackaged ? app.getPath('userData') : process.cwd()
  initLogging(join(logsRoot, 'logs'))
  mark('main:ready')
  settings = loadSettings(dataDir, (message) => log('warn', 'storage', message))
  notes = loadNotes(dataDir, (message) => log('warn', 'notes', message))
  registerIpc({
    win: () => mainWindow,
    getSettings: () => settings,
    setSettings: (next) => {
      settings = next
      saveSettings(dataDir, settings)
    },
    pushRecentCif,
    getNotes: () => notes,
    setNotes: (next) => {
      notes = next
    },
    notesDir: () => dataDir,
    pickExportPath,
    onNotesChanged: () => buildMenu(),
  })
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  log('error', 'main', `未捕获异常：${String(err)}`)
})
