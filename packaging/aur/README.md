# AUR packaging

These files mirror the package metadata intended for the separate
`ssh://aur@aur.archlinux.org/whatsapp-duo.git` repository.

Before publishing an update:

1. Create and push the immutable upstream version tag.
2. Update `pkgver`, reset `pkgrel` to `1`, and replace the source checksum.
3. Regenerate `.SRCINFO` with `makepkg --printsrcinfo`.
4. Build and inspect the package before pushing to the AUR.

The AUR repository should contain `PKGBUILD` and `.SRCINFO` at its root.
