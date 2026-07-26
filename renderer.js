'use strict'

const tabs = Array.from(document.querySelectorAll('.tab'))
const wvs = [document.getElementById('wv0'), document.getElementById('wv1')]
const hint = document.querySelector('.hint')
const unread = [0, 0]
const loaded = [true, false]
const ready = [false, false]
let active = 0
let secondaryLoadTimer = null

function updateHint () {
  if (hint) hint.style.display = ready[active] ? 'none' : 'grid'
}

function ensureLoaded (i) {
  if (loaded[i]) return
  loaded[i] = true
  wvs[i].src = wvs[i].dataset.src
  delete wvs[i].dataset.src
}

function scheduleSecondaryLoad (delay = 5000) {
  if (loaded[1] || secondaryLoadTimer) return
  secondaryLoadTimer = window.setTimeout(() => {
    secondaryLoadTimer = null
    ensureLoaded(1)
  }, delay)
}

function paintBadge (i) {
  const badge = tabs[i].querySelector('.badge')
  if (unread[i] > 0) {
    badge.textContent = unread[i] > 99 ? '99+' : String(unread[i])
    badge.hidden = false
    tabs[i].classList.add('has-unread')
  } else {
    badge.hidden = true
    tabs[i].classList.remove('has-unread')
  }
}

function pushTotal () {
  const total = unread[0] + unread[1]
  if (window.duo) window.duo.setUnreadTotal(total)
}

function show (i) {
  ensureLoaded(i)
  active = i
  wvs.forEach((webview, index) => webview.classList.toggle('show', index === i))
  tabs.forEach((tab, index) => tab.classList.toggle('active', index === i))
  updateHint()

  // Al mirar una cuenta, su insignia se limpia.
  unread[i] = 0
  paintBadge(i)
  pushTotal()
  try { wvs[i].focus() } catch {}
}

tabs.forEach((tab) => tab.addEventListener('click', () => show(Number(tab.dataset.i))))
document.getElementById('reload').addEventListener('click', () => {
  try { wvs[active].reload() } catch {}
})

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === '1') {
    event.preventDefault()
    show(0)
  }
  if (event.ctrlKey && event.key === '2') {
    event.preventDefault()
    show(1)
  }
})

wvs.forEach((webview, i) => {
  webview.addEventListener('dom-ready', () => {
    ready[i] = true
    if (i === active) updateHint()
  })
  if (i === 0) webview.addEventListener('did-stop-loading', () => scheduleSecondaryLoad())

  // El nº de no leídos viene en el título: "(3) WhatsApp".
  webview.addEventListener('page-title-updated', (event) => {
    const match = /\((\d+)\)/.exec(event.title || '')
    const count = match ? parseInt(match[1], 10) : 0
    unread[i] = (i === active) ? 0 : count
    paintBadge(i)
    pushTotal()
  })
})

// Evita competir por CPU/GPU durante el arranque. La segunda cuenta empieza
// unos segundos después; abrir su pestaña fuerza la carga inmediatamente.
scheduleSecondaryLoad(15000)
show(0)
