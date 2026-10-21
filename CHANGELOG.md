# Changelog

All notable changes to this project will be documented here.

## 1.0.1 - 2026-10-21

- Memory: block WhatsApp Web's service worker (two ~120 MB processes saved) and use software
  compositing instead of a GPU process (~100 MB saved). About 25 % less memory at startup in our
  measurement. Environment switches: `WHATSAPP_DUO_ALLOW_SW`, `WHATSAPP_DUO_GPU`.
- Add AUR packaging metadata under `packaging/aur`.
- Add a self-hosted star-growth chart to the README files.

## 1.0.0 - 2026-07-26

- Two isolated persistent WhatsApp Web sessions in one window.
- System tray integration and unread counter.
- Delayed loading of the secondary session to reduce startup contention.
- Native Wayland support through the system Electron runtime.
- Restricted permissions, navigation, window creation, IPC, and Content
  Security Policy.
- Original project icon, bilingual documentation and reproducible system-wide
  installation.
