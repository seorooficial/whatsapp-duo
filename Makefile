PREFIX ?= /usr
DESTDIR ?=
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
APPDIR = $(DATADIR)/whatsapp-duo

APP_FILES = main.js preload.js renderer.js index.html styles.css package.json icono.png

.PHONY: check install uninstall

check:
	node --check main.js
	node --check preload.js
	node --check renderer.js
	node --check scripts/generate-star-history.mjs

install:
	install -d "$(DESTDIR)$(APPDIR)"
	install -m644 $(APP_FILES) "$(DESTDIR)$(APPDIR)/"
	install -d "$(DESTDIR)$(BINDIR)"
	install -m755 whatsapp-duo "$(DESTDIR)$(BINDIR)/whatsapp-duo"
	install -d "$(DESTDIR)$(DATADIR)/applications"
	install -m644 whatsapp-duo.desktop "$(DESTDIR)$(DATADIR)/applications/whatsapp-duo.desktop"
	install -d "$(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps"
	install -m644 icono.svg "$(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps/whatsapp-duo.svg"
	install -d "$(DESTDIR)$(DATADIR)/icons/hicolor/256x256/apps"
	install -m644 icono.png "$(DESTDIR)$(DATADIR)/icons/hicolor/256x256/apps/whatsapp-duo.png"

uninstall:
	rm -f "$(DESTDIR)$(BINDIR)/whatsapp-duo"
	rm -f "$(DESTDIR)$(DATADIR)/applications/whatsapp-duo.desktop"
	rm -f "$(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps/whatsapp-duo.svg"
	rm -f "$(DESTDIR)$(DATADIR)/icons/hicolor/256x256/apps/whatsapp-duo.png"
	rm -f $(addprefix "$(DESTDIR)$(APPDIR)/",$(APP_FILES))
	rmdir --ignore-fail-on-non-empty "$(DESTDIR)$(APPDIR)"
