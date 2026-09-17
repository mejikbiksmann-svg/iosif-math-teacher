import { useEffect, useRef, useState } from 'react'
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

export function Whiteboard() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [handActive, setHandActive] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const board = host.querySelector<SVGSVGElement>('svg[aria-label="Интерактивная учебная доска"]')
    const selectButton = host.querySelector<HTMLButtonElement>('button[aria-label="Выделение"]')
    const toolbar = selectButton?.parentElement
    const shell = board?.parentElement
    if (!board || !toolbar || !shell) return

    let view = parseViewBox(board.getAttribute('viewBox'))
    const pointers = new Map<number, Point>()
    let lastPoint: Point | null = null
    let pinchStart: { distance: number; center: Point; view: ViewBox; anchor: Point } | null = null
    const savedStyles = new Map<HTMLButtonElement, { background: string; color: string }>()

    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.boardHand = 'true'
    button.setAttribute('aria-label', 'Рука')
    button.setAttribute('aria-pressed', 'false')
    button.title = 'Рука — перемещение и масштаб'
    Object.assign(button.style, {
      width: '44px', height: '44px', border: '0', borderRadius: '12px', display: 'grid',
      placeItems: 'center', background: 'transparent', color: '#525866', cursor: 'pointer', padding: '0',
    })
    const handIcon = document.createElement('span')
    button.appendChild(handIcon)
    selectButton.insertAdjacentElement('afterend', button)

    const root = document.createElement('div')
    root.style.display = 'contents'
    handIcon.appendChild(root)

    const overlay = document.createElement('div')
    overlay.dataset.boardHandOverlay = 'true'
    Object.assign(overlay.style, {
      position: 'absolute', zIndex: '2', display: 'none', touchAction: 'none', cursor: 'grab',
      background: 'transparent', userSelect: 'none', WebkitUserSelect: 'none',
    })
    shell.appendChild(overlay)

    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    iconSvg.setAttribute('width', '21'); iconSvg.setAttribute('height', '21'); iconSvg.setAttribute('viewBox', '0 0 24 24')
    iconSvg.setAttribute('fill', 'none'); iconSvg.setAttribute('stroke', 'currentColor'); iconSvg.setAttribute('stroke-width', '2')
    iconSvg.setAttribute('stroke-linecap', 'round'); iconSvg.setAttribute('stroke-linejoin', 'round')
    iconSvg.innerHTML = '<path d="M18 11V6a2 2 0 0 0-4 0v4"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10V5a2 2 0 0 0-4 0v8"/><path d="M6 13l-1.2-1.2a2 2 0 0 0-2.8 2.8l4.8 5A5 5 0 0 0 10.4 21H15a5 5 0 0 0 5-5v-5a2 2 0 0 0-4 0v1"/>'
    handIcon.appendChild(iconSvg)

    const positionOverlay = () => {
      const boardRect = board.getBoundingClientRect()
      const shellRect = shell.getBoundingClientRect()
      overlay.style.left = `${boardRect.left - shellRect.left}px`
      overlay.style.top = `${boardRect.top - shellRect.top}px`
      overlay.style.width = `${boardRect.width}px`
      overlay.style.height = `${boardRect.height}px`
    }

    const applyView = () => board.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`)

    const clientToWorld = (point: Point, sourceView = view): Point => {
      const rect = board.getBoundingClientRect()
      const rx = rect.width ? (point.x - rect.left) / rect.width : 0.5
      const ry = rect.height ? (point.y - rect.top) / rect.height : 0.5
      return { x: sourceView.x + rx * sourceView.width, y: sourceView.y + ry * sourceView.height }
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

    const refreshPinch = () => {
      if (pointers.size < 2) { pinchStart = null; return }
      const [a, b] = Array.from(pointers.values()).slice(0, 2)
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      pinchStart = {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        center,
        view: { ...view },
        anchor: clientToWorld(center, view),
      }
    }

    const zoomFromPinch = () => {
      if (!pinchStart || pointers.size < 2) return
      const rect = board.getBoundingClientRect()
      const [a, b] = Array.from(pointers.values()).slice(0, 2)
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
      const startZoom = DEFAULT_VIEW.width / pinchStart.view.width
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * (distance / pinchStart.distance)))
      const width = DEFAULT_VIEW.width / nextZoom
      const height = DEFAULT_VIEW.height / nextZoom
      const rx = rect.width ? (center.x - rect.left) / rect.width : 0.5
      const ry = rect.height ? (center.y - rect.top) / rect.height : 0.5
      view = {
        x: pinchStart.anchor.x - rx * width,
        y: pinchStart.anchor.y - ry * height,
        width,
        height,
      }
      applyView()
    }

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      overlay.setPointerCapture?.(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 1) lastPoint = { x: event.clientX, y: event.clientY }
      if (pointers.size === 2) refreshPinch()
      overlay.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      event.preventDefault()
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2) { zoomFromPinch(); return }
      const current = { x: event.clientX, y: event.clientY }
      if (lastPoint) pan(current.x - lastPoint.x, current.y - lastPoint.y)
      lastPoint = current
    }

    const endPointer = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      event.preventDefault()
      pointers.delete(event.pointerId)
      try { overlay.releasePointerCapture?.(event.pointerId) } catch { /* ignored */ }
      if (pointers.size === 1) {
        lastPoint = Array.from(pointers.values())[0]
        pinchStart = null
      } else if (pointers.size >= 2) {
        refreshPinch()
      } else {
        lastPoint = null
        pinchStart = null
        overlay.style.cursor = 'grab'
      }
    }

    const setActive = (active: boolean) => {
      setHandActive(active)
      button.setAttribute('aria-pressed', String(active))
      button.style.background = active ? '#eef0ff' : 'transparent'
      button.style.color = active ? '#4f6df5' : '#525866'
      overlay.style.display = active ? 'block' : 'none'
      positionOverlay()
      pointers.clear(); lastPoint = null; pinchStart = null

      const toolButtons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button')).filter(item => item !== button)
      if (active) {
        for (const item of toolButtons) {
          savedStyles.set(item, { background: item.style.background, color: item.style.color })
          const bg = item.style.background.toLowerCase()
          if (bg.includes('eef0ff') || bg.includes('238, 240, 255')) {
            item.style.background = 'transparent'
            item.style.color = '#525866'
          }
        }
      } else {
        for (const [item, style] of savedStyles) {
          item.style.background = style.background
          item.style.color = style.color
        }
        savedStyles.clear()
      }
    }

    button.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation()
      setActive(button.getAttribute('aria-pressed') !== 'true')
    })

    const onToolbarClick = (event: Event) => {
      const target = event.target as Element | null
      const clicked = target?.closest('button') as HTMLButtonElement | null
      if (clicked && clicked !== button && button.getAttribute('aria-pressed') === 'true') setActive(false)
    }

    overlay.addEventListener('pointerdown', onPointerDown)
    overlay.addEventListener('pointermove', onPointerMove)
    overlay.addEventListener('pointerup', endPointer)
    overlay.addEventListener('pointercancel', endPointer)
    toolbar.addEventListener('click', onToolbarClick, true)

    const resize = new ResizeObserver(positionOverlay)
    resize.observe(board)
    positionOverlay()

    return () => {
      resize.disconnect()
      overlay.remove()
      button.remove()
    }
  }, [])

  return <div ref={hostRef} data-hand-active={handActive ? 'true' : 'false'} style={{ position: 'relative' }}>
    <LegacyWhiteboard />
  </div>
}
