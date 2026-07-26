'use strict'
// Puente mínimo y seguro entre la UI (index.html) y el proceso principal.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('duo', Object.freeze({
  setUnreadTotal: (value) => {
    const total = Number(value)
    if (!Number.isSafeInteger(total) || total < 0 || total > 198) return
    ipcRenderer.send('unread-total', total)
  }
}))
