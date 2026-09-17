import { useEffect, useRef } from 'react'
import { Whiteboard as LegacyWhiteboard } from './WhiteboardLegacy'

type Point = { x: number; y: number }
type ViewBox = { x: number; y: number; width: number; height: number }

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
  return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v4"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10V5a2 2 0 0 0-4 0v8"/><path d="M6 13l-1.2-1.2a2 2 0 0 0-2.8 2.8l4.8 5A5 5 0 0 0 10.4 21H15a5 5 0 0 0 5-5v-5a2 2 0 0 0-4 0v1"/></svg>'
}

export function Whiteboard() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const board = host.querySelector<SVGSVGElement>('svg[aria-label="Интерактивная учебная доска"]')
    const selectButton = host.querySelector<HTMLButtonElement>('button[aria-label="Выделение"]')
    const toolbar = selectButton?.parentElement
    const shell = board?.parentElement
    if (!board || !toolbar || !shell) return

    let handActive = false
    let view = parseViewBox(board.getAttribute('viewBox'))
    const pointers = new Map<number, Point>()
    let lastPoint: Point | null = null
    let pinchStart: { distance: number; view: ViewBox; anchor: Point } | null = null
    let previouslyActiveButton: HTMLButtonElement | null = null
    let previousButtonBackground = ''
    let previousButtonColor = ''

    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.boardHand = 'true'
    button.setAttribute('aria-label', 'Рука')
    button.setAttribute('aria-pressed', 'false')
    button.title = 'Рука — перемещение и масштаб'
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
    selectButton.insertAdjacentElement('afterend', button)

    const overlay = document.createElement('div')
    overlay.dataset.boardHandOverlay = 'true'
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '2',
      display: 'none',
      touchAction: 'none',
      cursor: 'grab',
      background: 'transparent',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    })
    shell.appendChild(overlay)

    const applyView = () => {
      board.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`)
    }

    const clientToWorld = (point: Point, sourceView = view): Point => {
      const rect = board.getBoundingClientRect()
      const rx = rect.width ? (point.x - rect.left) / rect.width : 0.5
      const ry = rect.height ? (point.y - rect.top) / rect.height : 0.5
      return {
        x: sourceView.x + rx * sourceView.width,
        y: sourceView.y + ry * sourceView.height,
      }
    }

    const pan = (dx: number, dy: number) => {
      const rect = board.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      view = {
        ...view,
        x: view.x - dx * (view.width / rect.width),
        y: view.y - dy * (view.height / rect.height),
      }
      applyView()
    }

    const startPinch = () => {
      if (pointers.size < 2) {
        pinchStart = null
        return
      }
      const [a, b] = Array.from(pointers.values()).slice(0, 2)
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      pinchStart = {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        view: { ...view },
        anchor: clientToWorld(center, view),
      }
    }

    const updatePinch = () => {
      if (!pinchStart || pointers.size < 2) return
      const rect = board.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const [a, b] = Array.from(pointers.values()).slice(0, 2)
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
      const startZoom = DEFAULT_VIEW.width / pinchStart.view.width
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * (distance / pinchStart.distance)))
      const width = DEFAULT_VIEW.width / nextZoom
      const height = DEFAULT_VIEW.height / nextZoom
      const rx = (center.x - rect.left) / rect.width
      const ry = (center.y - rect.top) / rect.height
      view = {
        x: pinchStart.anchor.x - rx * width,
        y: pinchStart.anchor.y - ry * height,
        width,
        height,
      }
      applyView()
    }

    const deactivateCurrentToolVisual = () => {
      const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button')).filter(item => item !== button)
      previouslyActiveButton = buttons.find(item => {
        const bg = getComputedStyle(item).backgroundColor
        return bg === 'rgb(238, 240, 255)' || item.style.background.includes('#eef0ff')
      }) ?? null
      if (!previouslyActiveButton) return
      previousButtonBackground = previouslyActiveButton.style.background
      previousButtonColor = previouslyActiveButton.style.color
      previouslyActiveButton.style.background = 'transparent'
      previouslyActiveButton.style.color = '#525866'
    }

    const restoreCurrentToolVisual = () => {
      if (!previouslyActiveButton) return
      previouslyActiveButton.style.background = previousButtonBackground
      previouslyActiveButton.style.color = previousButtonColor
      previouslyActiveButton = null
    }

    const setHandActive = (active: boolean) => {
      handActive = active
      button.setAttribute('aria-pressed', String(active))
      button.style.background = active ? '#eef0ff' : 'transparent'
      button.style.color = active ? '#4f6df5' : '#525866'
      overlay.style.display = active ? 'block' : 'none'
      overlay.style.cursor = active ? 'grab' : 'default'
      pointers.clear()
      lastPoint = null
      pinchStart = null
      if (active) deactivateCurrentToolVisual()
      else restoreCurrentToolVisual()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!handActive) return
      event.preventDefault()
      event.stopPropagation()
      overlay.setPointerCapture?.(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 1) lastPoint = { x: event.clientX, y: event.clientY }
      if (pointers.size === 2) startPinch()
      overlay.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!handActive || !pointers.has(event.pointerId)) return
      event.preventDefault()
      event.stopPropagation()
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2) {
        updatePinch()
        return
      }
      const current = { x: event.clientX, y: event.clientY }
      if (lastPoint) pan(current.x - lastPoint.x, current.y - lastPoint.y)
      lastPoint = current
    }

    const endPointer = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      event.preventDefault()
      event.stopPropagation()
      pointers.delete(event.pointerId)
      try { overlay.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
      if (pointers.size === 1) {
        lastPoint = Array.from(pointers.values())[0]
        pinchStart = null
      } else if (pointers.size >= 2) {
        startPinch()
      } else {
        lastPoint = null
        pinchStart = null
        overlay.style.cursor = 'grab'
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (!handActive) return
      event.preventDefault()
      const rect = board.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const point = { x: event.clientX, y: event.clientY }
      const anchor = clientToWorld(point)
      const currentZoom = DEFAULT_VIEW.width / view.width
      const factor = Math.exp(-event.deltaY * 0.0015)
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * factor))
      const width = DEFAULT_VIEW.width / nextZoom
      const height = DEFAULT_VIEW.height / nextZoom
      const rx = (point.x - rect.left) / rect.width
      const ry = (point.y - rect.top) / rect.height
      view = { x: anchor.x - rx * width, y: anchor.y - ry * height, width, height }
      applyView()
    }

    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      setHandActive(!handActive)
    })

    const onToolbarClick = (event: Event) => {
      const target = event.target as Element | null
      const clicked = target?.closest('button') as HTMLButtonElement | null
      if (handActive && clicked && clicked !== button) setHandActive(false)
    }

    overlay.addEventListener('pointerdown', onPointerDown)
    overlay.addEventListener('pointermove', onPointerMove)
    overlay.addEventListener('pointerup', endPointer)
    overlay.addEventListener('pointercancel', endPointer)
    overlay.addEventListener('wheel', onWheel, { passive: false })
    toolbar.addEventListener('click', onToolbarClick, true)

    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown)
      overlay.removeEventListener('pointermove', onPointerMove)
      overlay.removeEventListener('pointerup', endPointer)
      overlay.removeEventListener('pointercancel', endPointer)
      overlay.removeEventListener('wheel', onWheel)
      toolbar.removeEventListener('click', onToolbarClick, true)
      overlay.remove()
      button.remove()
    }
  }, [])

  return <div ref={hostRef} style={{ position: 'relative' }}>
    <LegacyWhiteboard />
  </div>
}
