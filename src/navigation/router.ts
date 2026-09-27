export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
export function routePath(route: string) { return `${basePath}${route === '/' ? '' : route}` || '/' }
export function currentRoute() { const path = window.location.pathname; const route = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path; return route.replace(/\/$/, '') || '/dashboard' }
export function navigate(route: string) { window.history.pushState({}, '', routePath(route)); window.dispatchEvent(new PopStateEvent('popstate')) }
