# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature instead of opening
a public issue. Include the affected version, impact, reproduction steps, and
a minimal proof of concept that does not contain real account or chat data.

Never attach WhatsApp session directories, cookies, QR codes, phone numbers,
chat exports, screenshots containing personal data, or authentication tokens.

## Privacy boundary

This project contains no backend, analytics, proxy, or account service. Each
WhatsApp Web account runs in a separate persistent Electron partition stored
locally in the user's Electron data directory. Those runtime directories are
not source files and must never be committed to a repository.

## Supported versions

Security fixes target the latest tagged release.
