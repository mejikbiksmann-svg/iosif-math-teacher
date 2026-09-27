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
    let previousActive: HTMLButtonElement | null = null
    let previousBackground = ''
    let previousColor = ''

    const handButton = document.createElement('button')
    handButton.type = 'button'
    handButton.dataset.boardHand = 'true'
    handButton.setAttribute('aria-label', 'Рука')
    handButton.setAttribute('aria-pressed', 'false')
    handButton.title = 'Рука — перемещение и масштаб'
    handButton.innerHTML = handIcon()
    Object.assign(handButton.style, {
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
    selectButton.insertAdjacentElement('afterend', handButton)

    const zoomBadge = document.createElement('div')
    zoomBadge.dataset.boardZoom = 'true'
    Object.assign(zoomBadge.style, {
      position: 'absolute',
      right: '18px',
      bottom: '18px',
      zIndex: '4',
      padding: '7px 10px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,.96)',
      border: '1px solid #e7e9ee',
      color: '#525866',
      fontSize: '12px',
      fontWeight: '700',
      pointerEvents: 'none',
    })
    shell.appendChild(zoomBadge)

    const updateGrid = () => {
      const rect = board.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const zoom = DEFAULT_VIEW.width / view.width
      const grid = 24 * zoom
      const pxPerWorldX = rect.width / view.width
      const pxPerWorldY = rect.height / view.height
      board.style.backgroundSize = `${grid}px ${grid}px`
      board.style.backgroundPosition = `${-view.x * pxPerWorldX}px ${-view.y * pxPerWorldY}px`
      zoomBadge.textContent = `${Math.round(zoom * 100)}%`
    }

    const applyView = () => {
      board.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`)
      updateGrid()
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

    const clearOtherToolVisual = () => {
      const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button')).filter(item => item !== handButton)
      previousActive = buttons.find(item => getComputedStyle(item).backgroundColor === 'rgb(238, 240, 255)') ?? null
      if (!previousActive) return
      previousBackground = previousActive.style.background
      previousColor = previousActive.style.color
      previousActive.style.background = 'transparent'
      previousActive.style.color = '#525866'
    }

    const restoreOtherToolVisual = () => {
      if (!previousActive) return
      previousActive.style.background = previousBackground
      previousActive.style.color = previousColor
      previousActive = null
    }

    const setHandActive = (active: boolean) => {
      handActive = active
      handButton.setAttribute('aria-pressed', String(active))
      handButton.style.background = active ? '#eef0ff' : 'transparent'
      handButton.style.color = active ? '#4f6df5' : '#525866'
      board.style.cursor = active ? 'grab' : ''
      board.style.touchAction = active ? 'none' : 'none'
      pointers.clear()
      lastPoint = null
      pinchStart = null
      if (active) clearOtherToolVisual()
      else restoreOtherToolVisual()
    }

    const stopBoardTool = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!handActive) return
      stopBoardTool(event)
      board.setPointerCapture?.(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 1) lastPoint = { x: event.clientX, y: event.clientY }
      if (pointers.size === 2) startPinch()
      board.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!handActive || !pointers.has(event.pointerId)) return
      stopBoardTool(event)
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
      if (!handActive || !pointers.has(event.pointerId)) return
      stopBoardTool(event)
      pointers.delete(event.pointerId)
      try { board.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
      if (pointers.size === 1) {
        lastPoint = Array.from(pointers.values())[0]
        pinchStart = null
      } else if (pointers.size >= 2) {
        startPinch()
      } else {
        lastPoint = null
        pinchStart = null
        board.style.cursor = 'grab'
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (!handActive) return
      stopBoardTool(event)
      const rect = board.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const point = { x: event.clientX, y: event.clientY }
      const anchor = clientToWorld(point)
      const currentZoom = DEFAULT_VIEW.width / view.width
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * Math.exp(-event.deltaY * 0.0015)))
      const width = DEFAULT_VIEW.width / nextZoom
      const height = DEFAULT_VIEW.height / nextZoom
      const rx = (point.x - rect.left) / rect.width
      const ry = (point.y - rect.top) / rect.height
      view = { x: anchor.x - rx * width, y: anchor.y - ry * height, width, height }
      applyView()
    }

    handButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      setHandActive(!handActive)
    })

    const onToolbarClick = (event: Event) => {
      const target = event.target as Element | null
      const clicked = target?.closest('button') as HTMLButtonElement | null
      if (handActive && clicked && clicked !== handButton) setHandActive(false)
    }

    board.addEventListener('pointerdown', onPointerDown, true)
    board.addEventListener('pointermove', onPointerMove, true)
    board.addEventListener('pointerup', endPointer, true)
    board.addEventListener('pointercancel', endPointer, true)
    board.addEventListener('wheel', onWheel, { capture: true, passive: false })
    toolbar.addEventListener('click', onToolbarClick, true)
    window.addEventListener('resize', updateGrid)
    applyView()

    return () => {
      board.removeEventListener('pointerdown', onPointerDown, true)
      board.removeEventListener('pointermove', onPointerMove, true)
      board.removeEventListener('pointerup', endPointer, true)
      board.removeEventListener('pointercancel', endPointer, true)
      board.removeEventListener('wheel', onWheel, true)
      toolbar.removeEventListener('click', onToolbarClick, true)
      window.removeEventListener('resize', updateGrid)
      zoomBadge.remove()
      handButton.remove()
    }
  }, [])

  return <div ref={hostRef} style={{ position: 'relative' }}>
    <LegacyWhiteboard />
  </div>
}
