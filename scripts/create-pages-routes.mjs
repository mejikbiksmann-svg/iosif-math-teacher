import { copyFile, mkdir } from 'node:fs/promises'

// GitHub Pages does not provide SPA history fallbacks. Keep /lesson as a real
// static entry point while using the exact same application bundle.
await mkdir('dist/lesson', { recursive: true })
await copyFile('dist/index.html', 'dist/lesson/index.html')
