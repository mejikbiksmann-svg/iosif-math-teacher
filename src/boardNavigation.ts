type ViewBox = { x: number; y: number; width: number; height: number }
type ClientPoint = { x: number; y: number }

const BOARD_SELECTOR = 'svg[aria-label="Интерактивная учебная доска"]'
const DEFAULT_VIEW: ViewBox = { x: 0, y: 0, width: 1200, height: 650 }
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

function parseViewBox(value: string | null): ViewBox {
  if (!value) return { ...DEFAULT_VIEW }
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return { ...DEFAULT_VIEW }
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
}

function handIcon() {
  return `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 11V6a2 2 0 0 0-4 0v4"/>
      <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
      <path d="M10 10V5a2 2 0 0 0-4 0v8"/>
      <path d="M6 13l-1.2-1.2a2 2 0 0 0-2.8 2.8l4.8 5A5 5 0 0 0 10.4 21H15a5 5 0 0 0 5-5v-5a2 2 0 0 0-4 0v1"/>
    </svg>`
}

export function installBoardNavigation() {
  if (typeof window === 'undefined') return

  let view: ViewBox = { ...DEFAULT_VIEW }
  let handActive = false
  let handButton: HTMLButtonElement | null = null
  const pointers = new Map<number, ClientPoint>()
  let lastSinglePoint: ClientPoint | null = null
  let pinchStart: { distance: number; center: ClientPoint; view: ViewBox; anchorWorld: ClientPoint } | null = null

  const getBoard = () => document.querySelector<SVGSVGElement>(BOARD_SELECTOR)

  const applyView = () => {
    const board = getBoard()
    if (!board) return
    const next = `${view.x} ${view.y} ${view.width} ${view.height}`
    if (board.getAttribute('viewBox') !== next) board.setAttribute('viewBox', next)
  }

  const updateHandButton = () => {
    if (!handButton) return
    handButton.style.background = handActive ? '#eef0ff' : 'transparent'
    handButton.style.color = handActive ? '#4f6df5' : '#525866'
    handButton.setAttribute('aria-pressed', String(handActive))
    handButton.title = handActive ? 'Рука — перемещение и масштаб' : 'Рука'
  }

  const setHandActive = (active: boolean) => {
    handActive = active
    pointers.clear()
    lastSinglePoint = null
    pinchStart = null
    updateHandButton()
    const board = getBoard()
    if (board) board.style.cursor = active ? 'grab' : ''
  }

  const ensureHandButton = () => {
    const board = getBoard()
    if (!board) return
    const shell = board.parentElement
    if (!shell) return
    const selectButton = shell.querySelector<HTMLButtonElement>('button[aria-label="Выделение"]')
    if (!selectButton) return
    const toolbar = selectButton.parentElement
    if (!toolbar) return

    const existing = toolbar.querySelector<HTMLButtonElement>('button[data-board-hand="true"]')
    if (existing) {
      handButton = existing
      updateHandButton()
      return
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.boardHand = 'true'
    button.setAttribute('aria-label', 'Рука')
    button.setAttribute('aria-pressed', 'false')
    button.innerHTML = handIcon()
    Object.assign(button.style, {
      width: '44px',
      height: '44px',
      border: '0',
      borderRadius: '12px',
      display: 'grid',
      placeItems: 'center',
      background: 'transparent',
      color: '#525866',
      cursor: 'pointer',
      padding: '0',
    })

    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      if (!handActive) {
        selectButton.click()
        setHandActive(true)
      } else {
        setHandActive(false)
      }
    })

    selectButton.insertAdjacentElement('afterend', button)
    handButton = button
    updateHandButton()

    toolbar.addEventListener('click', event => {
      const target = event.target as Element | null
      const clickedButton = target?.closest('button') as HTMLButtonElement | null
      if (!clickedButton || clickedButton === handButton) return
      if (handActive) setHandActive(false)
    }, true)
  }

  const clientToWorld = (point: ClientPoint, sourceView: ViewBox): ClientPoint => {
    const board = getBoard()
    if (!board) return { x: sourceView.x, y: sourceView.y }
    const rect = board.getBoundingClientRect()
    const rx = rect.width ? (point.x - rect.left) / rect.width : 0.5
    const ry = rect.height ? (point.y - rect.top) / rect.height : 0.5
    return { x: sourceView.x + rx * sourceView.width, y: sourceView.y + ry * sourceView.height }
  }

  const panByClientDelta = (dx: number, dy: number) => {
    const board = getBoard()
    if (!board) return
    const rect = board.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    view = {
      ...view,
      x: view.x - dx * (view.width / rect.width),
      y: view.y - dy * (view.height / rect.height),
    }
    applyView()
  }

  const zoomAt = (clientPoint: ClientPoint, factor: number) => {
    const board = getBoard()
    if (!board) return
    const rect = board.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const currentZoom = DEFAULT_VIEW.width / view.width
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * factor))
    const nextWidth = DEFAULT_VIEW.width / nextZoom
    const nextHeight = DEFAULT_VIEW.height / nextZoom
    const anchor = clientToWorld(clientPoint, view)
    const rx = (clientPoint.x - rect.left) / rect.width
    const ry = (clientPoint.y - rect.top) / rect.height

    view = {
      x: anchor.x - rx * nextWidth,
      y: anchor.y - ry * nextHeight,
      width: nextWidth,
      height: nextHeight,
    }
    applyView()
  }

  const refreshPinchStart = () => {
    if (pointers.size < 2) {
      pinchStart = null
      return
    }
    const [a, b] = Array.from(pointers.values()).slice(0, 2)
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
    pinchStart = { distance, center, view: { ...view }, anchorWorld: clientToWorld(center, view) }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!handActive) return
    const target = event.target as Element | null
    if (!target?.closest(BOARD_SELECTOR)) return
    event.preventDefault()
    event.stopPropagation()
    const board = getBoard()
    board?.setPointerCapture?.(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1) lastSinglePoint = { x: event.clientX, y: event.clientY }
    if (pointers.size === 2) refreshPinchStart()
    if (board) board.style.cursor = 'grabbing'
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!handActive || !pointers.has(event.pointerId)) return
    event.preventDefault()
    event.stopPropagation()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.size >= 2) {
      if (!pinchStart) refreshPinchStart()
      if (!pinchStart) return
      const board = getBoard()
      if (!board) return
      const rect = board.getBoundingClientRect()
      const [a, b] = Array.from(pointers.values()).slice(0, 2)
      const currentCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const currentDistance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
      const startZoom = DEFAULT_VIEW.width / pinchStart.view.width
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * (currentDistance / pinchStart.distance)))
      const nextWidth = DEFAULT_VIEW.width / nextZoom
      const nextHeight = DEFAULT_VIEW.height / nextZoom
      const rx = rect.width ? (currentCenter.x - rect.left) / rect.width : 0.5
      const ry = rect.height ? (currentCenter.y - rect.top) / rect.height : 0.5
      view = {
        x: pinchStart.anchorWorld.x - rx * nextWidth,
        y: pinchStart.anchorWorld.y - ry * nextHeight,
        width: nextWidth,
        height: nextHeight,
      }
      applyView()
      return
    }

    const current = { x: event.clientX, y: event.clientY }
    if (lastSinglePoint) panByClientDelta(current.x - lastSinglePoint.x, current.y - lastSinglePoint.y)
    lastSinglePoint = current
  }

  const endPointer = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    event.preventDefault()
    event.stopPropagation()
    pointers.delete(event.pointerId)
    const board = getBoard()
    try { board?.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
    if (pointers.size === 1) {
      lastSinglePoint = Array.from(pointers.values())[0]
      pinchStart = null
    } else if (pointers.size >= 2) {
      refreshPinchStart()
    } else {
      lastSinglePoint = null
      pinchStart = null
      if (board) board.style.cursor = handActive ? 'grab' : ''
    }
  }

  const onWheel = (event: WheelEvent) => {
    if (!handActive) return
    const target = event.target as Element | null
    if (!target?.closest(BOARD_SELECTOR)) return
    event.preventDefault()
    const factor = Math.exp(-event.deltaY * 0.0015)
    zoomAt({ x: event.clientX, y: event.clientY }, factor)
  }

  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerup', endPointer, true)
  window.addEventListener('pointercancel', endPointer, true)
  window.addEventListener('wheel', onWheel, { capture: true, passive: false })

  const observer = new MutationObserver(() => {
    ensureHandButton()
    applyView()
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['viewBox'] })

  requestAnimationFrame(() => {
    const board = getBoard()
    if (board) view = parseViewBox(board.getAttribute('viewBox'))
    ensureHandButton()
    applyView()
  })
}