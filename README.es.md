<p align="center">
  <img src="assets/readme-hero.png" alt="WhatsApp Duo — dos cuentas en una aplicación ligera para Linux" width="100%">
</p>

<p align="center">
  <a href="README.md">English</a>
  ·
  <a href="#instalación">Instalación</a>
  ·
  <a href="#seguridad-y-privacidad">Seguridad</a>
  ·
  <a href="CONTRIBUTING.md">Contribuir</a>
</p>

<p align="center">
  <a href="https://github.com/seorooficial/whatsapp-duo/stargazers"><img alt="Estrellas de GitHub" src="https://img.shields.io/github/stars/seorooficial/whatsapp-duo?style=for-the-badge&logo=github&logoColor=DFFAF2&labelColor=071016&color=159B82"></a>
  <a href="https://github.com/seorooficial/whatsapp-duo/network/members"><img alt="Forks de GitHub" src="https://img.shields.io/github/forks/seorooficial/whatsapp-duo?style=for-the-badge&logo=github&logoColor=DFFAF2&labelColor=071016&color=159B82"></a>
  <a href="https://github.com/seorooficial/whatsapp-duo/releases/latest"><img alt="Última versión" src="https://img.shields.io/github/v/release/seorooficial/whatsapp-duo?style=for-the-badge&logo=github&logoColor=DFFAF2&labelColor=071016&color=159B82"></a>
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/github/license/seorooficial/whatsapp-duo?style=for-the-badge&labelColor=071016&color=159B82"></a>
</p>

**WhatsApp Duo** es una pequeña aplicación Electron que reúne dos cuentas de
WhatsApp Web en una ventana de Linux. Cada cuenta utiliza una partición
persistente independiente, por lo que sus cookies, almacenamiento local y
sesión permanecen aislados.

No hay backend propio, API no oficial de WhatsApp, telemetría ni un Electron
empaquetado por duplicado. La aplicación abre el servicio oficial
`web.whatsapp.com` y utiliza el Electron mantenido por tu distribución.

<p align="center">
  <img src="assets/app-demo.png" alt="Interfaz ilustrativa de WhatsApp Duo con dos cuentas aisladas y conversaciones ficticias" width="100%">
  <br>
  <sub>Vista ilustrativa con conversaciones ficticias. No contiene cuentas, códigos QR ni sesiones reales.</sub>
</p>

## Características

| | Función | Resultado |
| --- | --- | --- |
| **02** | Cuentas aisladas | Particiones persistentes distintas para las cuentas 1 y 2 |
| **⚡** | Arranque ligero | La segunda cuenta se retrasa para reducir la carga de CPU y GPU |
| **◉** | Bandeja nativa | Ocultar, ver los mensajes pendientes y salir limpiamente |
| **⌨** | Cambio rápido | Barra lateral o `Ctrl+1` / `Ctrl+2` |
| **◇** | Electron del sistema | No duplica un runtime de Electron de 200–300 MB |
| **▣** | Preparado para Wayland | Ozone nativo y valores conservadores para NVIDIA |
| **○** | Cero dependencias npm | Código pequeño y auditable, sin analítica |
| **▤** | Atento a la memoria | Sin service worker inútil y sin proceso de GPU: ~25 % menos de memoria al arrancar |

## Instalación

### Arch Linux y CachyOS

Instala el metapaquete oficial de Electron y las herramientas básicas:

```bash
sudo pacman -S --needed electron git make
```

Clona, comprueba e instala:

```bash
git clone https://github.com/seorooficial/whatsapp-duo.git
cd whatsapp-duo
make check
sudo make install
```

Abre **WhatsApp Duo** desde el menú de aplicaciones o ejecuta:

```bash
whatsapp-duo
```

### Ejecutar sin instalar

Después de instalar Electron:

```bash
git clone https://github.com/seorooficial/whatsapp-duo.git
cd whatsapp-duo
./whatsapp-duo
```

El lanzador detecta `electron` y los ejecutables versionados de Arch desde
`electron38` hasta `electron43`.

### Desinstalación

Desde el directorio clonado:

```bash
sudo make uninstall
```

La desinstalación del programa **no** borra automáticamente los perfiles de
inicio de sesión, evitando que se pierdan sesiones activas por accidente.

## Uso

1. Abre la cuenta **1** y vincúlala mediante el QR de WhatsApp Web.
2. Cambia a la cuenta **2** y vincula la segunda cuenta.
3. Utiliza la barra lateral o `Ctrl+1` / `Ctrl+2` para cambiar.
4. Cierra la ventana para mantenerla en la bandeja; elige **Salir** en su menú
   para detenerla completamente.

## Uso de memoria

WhatsApp Web pesa mucho, así que se apagan dos cosas que aquí no aportaban nada. Cada una es reversible con una variable de
entorno:

| Medida | Ahorra | Interruptor |
| --- | --- | --- |
| **Sin service worker.** WhatsApp Web registra uno por cuenta (`sw.js`) y cada uno corre en su propio proceso de ~120 MB. Electron no tiene servicio push, así que no se pierde ninguna notificación: salen de la propia página. | ~120 MB por cuenta | `WHATSAPP_DUO_ALLOW_SW=1` |
| **Composición por software** en lugar de un proceso de GPU. | ~100 MB | `WHATSAPP_DUO_GPU=1` |

Medido en una máquina (Electron 42, Linux, Wayland) con cuentas sin sesión: **1.375 MB → 1.038 MB al arrancar (−25 %)**, y de
cinco procesos de renderizado a tres. El sonido y las notificaciones en segundo plano siguen funcionando con la ventana oculta.
Tus números serán distintos.

**Un callejón sin salida, por si ayuda.** Pedir a las páginas que suelten memoria con la API de depuración de Electron parecía
prometedor (−135 MB en una cuenta de 630 MB), pero `Memory.forciblyPurgeJavaScriptMemory` simula una intervención por falta de
memoria y **congela la página hasta que se recarga**, de modo que las cuentas dejan de sincronizar en silencio con la ventana
oculta. No se usa. Además, en nuestras pruebas los `webview` de la ventana informaron `visibilityState === "visible"` con la ventana oculta,
así que no des por hecho que Chromium los ralentiza.

## Seguridad y privacidad

El repositorio público nunca incluye perfiles de usuario ni sesiones de
dispositivos vinculados. Electron crea esos datos localmente tras el primer
arranque.

La aplicación aplica además estas restricciones:

- Sandbox de Electron y aislamiento de contexto activados.
- Node.js desactivado en la interfaz y en ambos webviews.
- Política CSP estricta para la interfaz local.
- Webviews restringidos a `https://web.whatsapp.com`.
- Ventanas nuevas bloqueadas; los enlaces HTTP(S) externos validados se abren
  en el navegador del sistema.
- Permisos limitados a las funciones necesarias y aceptados solamente desde el
  origen exacto de WhatsApp Web.
- Mensajes IPC validados contra la ventana local de confianza.
- Se bloquea el registro del service worker de `web.whatsapp.com`; el resto del acceso de red de la página no cambia.

Comunica problemas de seguridad en privado siguiendo
[SECURITY.md](SECURITY.md). Nunca adjuntes códigos QR activos, cookies o
archivos de sesión a una incidencia.

## Arquitectura

```mermaid
flowchart LR
    UI["Interfaz local<br>index.html"] --> A1["Cuenta 1<br>persist:cuenta1"]
    UI --> A2["Cuenta 2<br>persist:cuenta2"]
    A1 --> WA["web.whatsapp.com"]
    A2 --> WA
    MAIN["Proceso principal<br>sandbox · permisos · navegación"] --> UI
    MAIN --> A1
    MAIN --> A2
    UI --> TRAY["Bandeja nativa<br>contador combinado"]
```

## Crecimiento del proyecto

El contador y la gráfica utilizan datos en vivo de GitHub. La gráfica se
genera dentro de este repositorio cuando cambian las estrellas, sin servicios
gráficos de terceros ni tokens expuestos:

<p align="center">
  <a href="https://github.com/seorooficial/whatsapp-duo/stargazers"><img alt="Contador de estrellas de GitHub en vivo" src="https://img.shields.io/github/stars/seorooficial/whatsapp-duo?style=for-the-badge&logo=github&logoColor=DFFAF2&label=ESTRELLAS%20EN%20VIVO&labelColor=071016&color=2DD4A5"></a>
</p>

<p align="center">
  <a href="https://github.com/seorooficial/whatsapp-duo/stargazers">
    <picture>
      <source media="(max-width: 600px)" srcset="assets/star-history-mobile.svg">
      <img src="assets/star-history.svg" alt="Crecimiento acumulado de estrellas de WhatsApp Duo en GitHub" width="100%">
    </picture>
  </a>
</p>

Si WhatsApp Duo te resulta útil, una estrella ayuda a que otros usuarios de
Linux lo encuentren.

## Contribuciones

Los informes de errores y pull requests concretos son bienvenidos. Lee
[CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir uno.

## Licencia

Publicado bajo la [Licencia MIT](LICENSE).

## Aviso sobre marcas

WhatsApp Duo es un proyecto independiente y no oficial. No está afiliado,
autorizado, mantenido, patrocinado ni respaldado por WhatsApp LLC o Meta
Platforms, Inc. WhatsApp es una marca de su propietario correspondiente. El
proyecto utiliza un icono propio y emplea el nombre WhatsApp únicamente para
describir su compatibilidad con WhatsApp Web.
