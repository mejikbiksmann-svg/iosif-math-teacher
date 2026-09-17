type ViewBox = { x: number; y: number; width: number; height: number }

type PanSession = {
  pointerId: number
  lastX: number
  lastY: number
}

const BOARD_SELECTOR = 'svg[aria-label="Интерактивная учебная доска"]'
const PEN_BUTTON_SELECTOR = 'button[aria-label="Стилус"]'
const HAND_BUTTON_ID = 'whiteboard-hand-tool'
const DEFAULT_VIEW: ViewBox = { x: 0, y: 0, width: 1200, height: 650 }

export function installBoardViewportPan() {
  if (typeof window === 'undefined') return

  let handMode = false
  let view: ViewBox = { ...DEFAULT_VIEW }
  let panSession: PanSession | null = null

  const getBoard = () => document.querySelector<SVGSVGElement>(BOARD_SELECTOR)

  const readCurrentView = () => {
    const board = getBoard()
    const raw = board?.getAttribute('viewBox')?.trim().split(/\s+/).map(Number)
    if (raw?.length === 4 && raw.every(Number.isFinite)) {
      view = { x: raw[0], y: raw[1], width: raw[2], height: raw[3] }
    }
  }

  const applyView = () => {
    const board = getBoard()
    if (!board) return
    const next = `${view.x} ${view.y} ${view.width} ${view.height}`
    if (board.getAttribute('viewBox') !== next) board.setAttribute('viewBox', next)
  }

  const setHandButtonActive = (active: boolean) => {
    const button = document.getElementById(HAND_BUTTON_ID) as HTMLButtonElement | null
    if (!button) return
    button.style.background = active ? '#eef0ff' : 'transparent'
    button.style.color = active ? '#4f6df5' : '#525866'
  }

  const setHandMode = (active: boolean) => {
    handMode = active
    panSession = null
    setHandButtonActive(active)

    const board = getBoard()
    if (board) board.style.cursor = active ? 'grab' : ''
  }

  const makeHandIcon = () => {
    const wrapper = document.createElement('span')
    wrapper.innerHTML = `
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 11V6a2 2 0 0 0-4 0v5" />
        <path d="M14 10V4a2 2 0 0 0-4 0v7" />
        <path d="M10 10.5V5a2 2 0 0 0-4 0v9" />
        <path d="M6 13.5 5 12a2 2 0 0 0-3 2.5l4.5 6A4 4 0 0 0 9.7 22H16a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0v1" />
      </svg>`
    return wrapper.firstElementChild as SVGElement
  }

  const ensureHandButton = () => {
    if (document.getElementById(HAND_BUTTON_ID)) return

    const penButton = document.querySelector<HTMLButtonElement>(PEN_BUTTON_SELECTOR)
    const toolbar = penButton?.parentElement
    if (!penButton || !toolbar) return

    const button = document.createElement('button')
    button.id = HAND_BUTTON_ID
    button.type = 'button'
    button.title = 'Рука — перемещение доски'
    button.setAttribute('aria-label', 'Рука')
    button.style.cssText = penButton.style.cssText
    button.style.background = 'transparent'
    button.style.color = '#525866'
    button.appendChild(makeHandIcon())
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      if (!handMode) readCurrentView()
      setHandMode(true)
    })

    toolbar.insertBefore(button, penButton)
  }

  const isBoardTarget = (event: PointerEvent) => {
    const target = event.target as Element | null
    return Boolean(target?.closest(BOARD_SELECTOR))
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!handMode || !isBoardTarget(event)) return

    event.preventDefault()
    event.stopImmediatePropagation()
    const board = getBoard()
    board?.setPointerCapture?.(event.pointerId)
    if (board) board.style.cursor = 'grabbing'

    panSession = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!handMode || !panSession || panSession.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopImmediatePropagation()

    const board = getBoard()
    if (!board) return
    const rect = board.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const dx = event.clientX - panSession.lastX
    const dy = event.clientY - panSession.lastY
    view = {
      ...view,
      x: view.x - dx * (view.width / rect.width),
      y: view.y - dy * (view.height / rect.height),
    }
    panSession = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    applyView()
  }

  const endPan = (event: PointerEvent) => {
    if (!handMode || !panSession || panSession.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopImmediatePropagation()
    panSession = null
    const board = getBoard()
    if (board) board.style.cursor = 'grab'
    try { board?.releasePointerCapture?.(event.pointerId) } catch { /* pointer capture may already be released */ }
  }

  const onToolbarClick = (event: MouseEvent) => {
    const button = (event.target as Element | null)?.closest('button') as HTMLButtonElement | null
    if (!button || button.id === HAND_BUTTON_ID) return
    if (button.closest(PEN_BUTTON_SELECTOR)?.id === HAND_BUTTON_ID) return

    const toolbar = document.querySelector(PEN_BUTTON_SELECTOR)?.parentElement
    if (toolbar?.contains(button) && handMode) setHandMode(false)
  }

  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerup', endPan, true)
  window.addEventListener('pointercancel', endPan, true)
  window.addEventListener('click', onToolbarClick, true)

  const observer = new MutationObserver(() => {
    ensureHandButton()
    if (handMode) {
      setHandButtonActive(true)
      applyView()
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })

  requestAnimationFrame(() => {
    ensureHandButton()
    readCurrentView()
  })
}
