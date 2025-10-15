# Text Simplifier (Vite + TypeScript)

Browser-only app to OCR/understand text in images and present simplified output in German, English, or Russian using Groq.

## Local development

- Node 20 recommended.
- Install deps and run dev server:

```
npm ci
npm run dev
```

## Configure Groq API key (browser-session)
On first analysis, the app will ask for your Groq API key and store it in `sessionStorage` for the current browser session. No server-side storage.

## Deploy to GitHub Pages

1. Initialize a new Git repo (if not already):
```
git init
git add .
git commit -m "init"
```

2. Create a new repo on GitHub (e.g., `yourname/text-simplifier`).
3. Add remote and push:
```
git branch -M main
git remote add origin https://github.com/yourname/text-simplifier.git
git push -u origin main
```

4. Enable GitHub Pages:
- Go to your repo → Settings → Pages
- Source: "GitHub Actions"
- The provided workflow `.github/workflows/deploy.yml` will build and deploy on every push to `main`.

5. Your site will be available at:
- `https://yourname.github.io/text-simplifier/`

If you deploy under a different repo name or user/org, adjust the URL accordingly.

## Notes
- Vite `base` is set to `` so assets resolve under a subpath (Pages).
- Web Speech API TTS voice selection implemented with fallbacks; Russian voice requires an OS/browsersupported voice.# Klartext Kamera

Eine Web-Anwendung zur Vereinfachung komplexer Texte aus Bildern mit KI-Power.

## Funktionen

- Fotografiere oder lade Bilder mit komplexen Texten hoch
- Wähle zwischen verschiedenen Vereinfachungsstilen:
  - Wichtigste Kernaussagen
  - Einfache Zusammenfassung
  
- Unterstützt mehrere Ausgabesprachen
- Text-to-Speech Funktion für die Ausgabe
- Kopieren der Ergebnisse in die Zwischenablage

## Lokal ausführen

**Voraussetzungen:** Node.js

1. Abhängigkeiten installieren:
   `npm install`

2. Anwendung starten:
   `npm run dev`

3. Browser öffnen: `http://localhost:5173`

## Technologie

- Frontend: Vite, TypeScript, HTML/CSS
- KI-API: Groq (Llama Vision Modell)
- Speech Synthesis: Browser Web Speech API
