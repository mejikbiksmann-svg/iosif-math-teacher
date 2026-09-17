type ViewBox = { x: number; y: number; width: number; height: number }

const BOARD_SELECTOR = 'svg[aria-label="Интерактивная учебная доска"]'
const DEFAULT_VIEW: ViewBox = { x: 0, y: 0, width: 1200, height: 650 }

export function installBoardViewportPan() {
  if (typeof window === 'undefined') return

  let view: ViewBox = { ...DEFAULT_VIEW }
  const originalScrollBy = window.scrollBy.bind(window)

  const getBoard = () => document.querySelector<SVGSVGElement>(BOARD_SELECTOR)

  const applyView = () => {
    const board = getBoard()
    if (!board) return
    const next = `${view.x} ${view.y} ${view.width} ${view.height}`
    if (board.getAttribute('viewBox') !== next) board.setAttribute('viewBox', next)
  }

  const panBoardByClientPixels = (dx: number, dy: number) => {
    const board = getBoard()
    if (!board) return false
    const rect = board.getBoundingClientRect()
    if (!rect.width || !rect.height) return false

    view = {
      ...view,
      x: view.x + dx * (view.width / rect.width),
      y: view.y + dy * (view.height / rect.height),
    }
    applyView()
    return true
  }

  window.scrollBy = ((arg1?: number | ScrollToOptions, arg2?: number) => {
    if (typeof arg1 === 'number') {
      const dx = arg1
      const dy = typeof arg2 === 'number' ? arg2 : 0
      // Whiteboard finger-drag currently calls window.scrollBy(0, deltaY).
      // Redirect that gesture to the infinite board viewport instead of the page.
      if (getBoard() && Math.abs(dx) < 0.01 && dy !== 0 && panBoardByClientPixels(dx, dy)) return
      originalScrollBy(dx, dy)
      return
    }

    if (arg1 && typeof arg1 === 'object') {
      const dx = Number(arg1.left ?? 0)
      const dy = Number(arg1.top ?? 0)
      if (getBoard() && Math.abs(dx) < 0.01 && dy !== 0 && panBoardByClientPixels(dx, dy)) return
      originalScrollBy(arg1)
      return
    }

    originalScrollBy(0, 0)
  }) as typeof window.scrollBy

  // React may re-apply its static viewBox after a board re-render.
  // Keep the current viewport stable so drawing after panning stays in place.
  const observer = new MutationObserver(() => applyView())
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['viewBox'] })

  requestAnimationFrame(applyView)
}
