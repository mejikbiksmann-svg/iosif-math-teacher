import { copyFile, mkdir } from 'node:fs/promises'

// GitHub Pages has no SPA fallback. Every client route gets the same Vite entry;
// the History API router then renders the requested screen under the base path.
const routes = ['dashboard', 'lessons', 'lessons/month', 'homework', 'tests', 'results', 'board', 'library', 'achievements']
for (const route of routes) {
  await mkdir(`dist/${route}`, { recursive: true })
  await copyFile('dist/index.html', `dist/${route}/index.html`)
}
// Known mock detail URLs remain directly refreshable in the static deployment.
for (const subject of ['mathematics', 'english', 'russian']) {
  for (let i = 1; i <= 4; i++) routes.push(`lessons/${subject}-lesson-${i}`)
  for (let i = 1; i <= 2; i++) routes.push(`homework/${subject}-homework-${i}`, `tests/${subject}-assessment-${i}`)
}
for (const route of routes.slice(9)) {
  await mkdir(`dist/${route}`, { recursive: true })
  await copyFile('dist/index.html', `dist/${route}/index.html`)
}
