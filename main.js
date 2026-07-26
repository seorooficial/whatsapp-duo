'use strict'
// WhatsApp Duo — proceso principal de Electron.
// Una ventana, dos cuentas de WhatsApp Web en <webview> con particiones
// de almacenamiento aisladas. Usa el Electron del sistema (repo oficial).

const { app, BrowserWindow, Tray, Menu, nativeImage, session, shell, ipcMain } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

// ---- Flags de arranque: Wayland nativo ----
app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// Mantener activo el throttling nativo de Chromium. Desactivarlo fuerza a las
// dos cuentas a dibujar frames y ejecutar timers incluso ocultas o en bandeja.
// NVIDIA + Wayland: Vulkan no es compatible con el compositor -> usar OpenGL.
app.commandLine.appendSwitch('disable-features', 'Vulkan')
// app_id / WM_CLASS estable para que Hyprland/Waybar asocien el icono
app.commandLine.appendSwitch('class', 'whatsapp-duo')

const APP_DIR = __dirname
const ICON_PATH = path.join(APP_DIR, 'icono.png')
const PARTITIONS = ['persist:cuenta1', 'persist:cuenta2']
const WHATSAPP_ORIGIN = 'https://web.whatsapp.com'
const UI_URL = pathToFileURL(path.join(APP_DIR, 'index.html')).href

// UA de Chrome "limpio" (sin el token Electron) para que WhatsApp Web
// no muestre el aviso de "navegador no compatible".
const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/' + process.versions.chrome + ' Safari/537.36'

app.setName('WhatsApp Duo')

let mainWindow = null
let tray = null
let isQuitting = false

function isWhatsAppUrl (value) {
  try {
    return new URL(value).origin === WHATSAPP_ORIGIN
  } catch {
    return false
  }
}

function isSafeExternalUrl (value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.origin !== WHATSAPP_ORIGIN
  } catch {
    return false
  }
}

function openExternalSafely (url) {
  if (!isSafeExternalUrl(url)) return
  setImmediate(() => {
    shell.openExternal(url).catch(() => {})
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })

  // Permisos que WhatsApp Web necesita (notificaciones, micro/cámara para
  // notas de voz y llamadas, portapapeles, pantalla completa).
  const ALLOWED_PERMISSIONS = new Set([
    'notifications', 'media', 'audioCapture', 'videoCapture',
    'clipboard-sanitized-write', 'fullscreen'
  ])

  function isTrustedPermissionOrigin (wc, requestingOrigin = '', details = {}) {
    const candidates = [
      requestingOrigin,
      details.requestingUrl,
      details.securityOrigin,
      wc && !wc.isDestroyed() ? wc.getURL() : ''
    ].filter(Boolean)

    return candidates.some(isWhatsAppUrl) &&
      (!details.embeddingOrigin || isWhatsAppUrl(details.embeddingOrigin))
  }

  function prepareSessions () {
    // La interfaz local no necesita ningún permiso del sistema.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) => cb(false))
    session.defaultSession.setPermissionCheckHandler(() => false)

    for (const p of PARTITIONS) {
      const ses = session.fromPartition(p)
      ses.setUserAgent(CHROME_UA)
      ses.setPermissionRequestHandler((wc, permission, cb, details) => {
        cb(ALLOWED_PERMISSIONS.has(permission) &&
          isTrustedPermissionOrigin(wc, '', details))
      })
      ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => {
        return ALLOWED_PERMISSIONS.has(permission) &&
          isTrustedPermissionOrigin(wc, requestingOrigin, details)
      })
    }
  }

  function createWindow () {
    mainWindow = new BrowserWindow({
      width: 1180,
      height: 800,
      minWidth: 780,
      minHeight: 520,
      icon: ICON_PATH,
      title: 'WhatsApp Duo',
      backgroundColor: '#0b141a',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(APP_DIR, 'preload.js'),
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: true,
        spellcheck: true
      }
    })

    // Impide que la interfaz local cree un webview distinto de las dos
    // sesiones previstas o le inyecte preferencias inseguras.
    mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
      const allowed = PARTITIONS.includes(params.partition) && isWhatsAppUrl(params.src)
      if (!allowed) {
        event.preventDefault()
        return
      }

      delete webPreferences.preload
      delete webPreferences.preloadURL
      webPreferences.nodeIntegration = false
      webPreferences.nodeIntegrationInSubFrames = false
      webPreferences.contextIsolation = true
      webPreferences.sandbox = true
      webPreferences.webSecurity = true
      webPreferences.allowRunningInsecureContent = false
    })

    mainWindow.setMenuBarVisibility(false)
    mainWindow.loadFile(path.join(APP_DIR, 'index.html'))

    // Cerrar la ventana la esconde a la bandeja (sigue recibiendo/sonando).
    mainWindow.on('close', (e) => {
      if (!isQuitting) { e.preventDefault(); mainWindow.hide() }
    })
  }

  function createTray () {
    let img = nativeImage.createFromPath(ICON_PATH)
    if (!img.isEmpty()) img = img.resize({ width: 22, height: 22 })
    tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
    tray.setToolTip('WhatsApp Duo')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir WhatsApp Duo', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
      { type: 'separator' },
      { label: 'Salir', click: () => { isQuitting = true; app.quit() } }
    ]))
    tray.on('click', () => {
      if (!mainWindow) return
      if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide()
      else { mainWindow.show(); mainWindow.focus() }
    })
  }

  // Total de no leídos -> tooltip de bandeja + contador de dock.
  function isTrustedIpcSender (event) {
    return Boolean(
      mainWindow &&
      !mainWindow.isDestroyed() &&
      event.sender === mainWindow.webContents &&
      event.sender.getURL() === UI_URL
    )
  }

  ipcMain.on('unread-total', (event, total) => {
    if (!isTrustedIpcSender(event)) return
    const parsed = Number(total)
    const n = Number.isSafeInteger(parsed) ? Math.min(198, Math.max(0, parsed)) : 0
    if (tray) tray.setToolTip(n > 0 ? ('WhatsApp Duo — ' + n + ' sin leer') : 'WhatsApp Duo')
    if (typeof app.setBadgeCount === 'function') app.setBadgeCount(n)
  })

  // Enlaces externos -> navegador del sistema; navegación de WhatsApp -> dentro.
  app.on('web-contents-created', (_e, contents) => {
    // También se aplica a cada <webview>. Así la cuenta no visible y toda la
    // aplicación cuando está en bandeja pueden reducir timers y repintados.
    contents.setBackgroundThrottling(true)
    contents.setWindowOpenHandler(({ url }) => {
      openExternalSafely(url)
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, navigationUrl) => {
      const isGuest = contents.getType() === 'webview'
      const allowed = isGuest ? isWhatsAppUrl(navigationUrl) : navigationUrl === UI_URL
      if (allowed) return

      event.preventDefault()
      openExternalSafely(navigationUrl)
    })
  })

  app.whenReady().then(() => {
    prepareSessions()
    createWindow()
    createTray()
  })

  // No salir al esconder la ventana: seguimos en bandeja.
  app.on('window-all-closed', () => {})
  app.on('before-quit', () => { isQuitting = true })
}
