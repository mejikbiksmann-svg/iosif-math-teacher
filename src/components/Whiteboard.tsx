import { memo, useRef, useState } from 'react'
import { Brush, Eraser, RotateCcw, RotateCw, Trash2 } from 'lucide-react'

type Point = { x: number; y: number }
type Stroke = { id: number; points: Point[]; color: string; width: number }
type Tool = 'pen' | 'eraser'

const palette = ['#202124', '#4f6df5', '#ef5b5b', '#22a06b', '#8b5cf6', '#f5a524']
const widths = [2, 4, 8, 12]

function pathFor(points: Point[]) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

const StrokePath = memo(function StrokePath({ stroke }: { stroke: Stroke }) {
  return <path d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
})

export function Whiteboard() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingRef = useRef(false)
  const activeStrokeIdRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<Point[]>([])
  const latestErasePointRef = useRef<Point | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastPointRef = useRef<Point | null>(null)
  const strokesRef = useRef<Stroke[]>([])

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#202124')
  const [width, setWidth] = useState(4)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [undoStack, setUndoStack] = useState<Stroke[][]>([])
  const [redoStack, setRedoStack] = useState<Stroke[][]>([])

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  function setStrokeState(next: Stroke[] | ((current: Stroke[]) => Stroke[])) {
    setStrokes(current => {
      const value = typeof next === 'function' ? next(current) : next
      strokesRef.current = value
      return value
    })
  }

  function cloneStrokes(source: Stroke[]) {
    return source.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ ...point })) }))
  }

  function snapshot() {
    setUndoStack(stack => [...stack, cloneStrokes(strokesRef.current)])
    setRedoStack([])
  }

  function pointFromClient(clientX: number, clientY: number): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * 1200,
      y: ((clientY - rect.top) / rect.height) * 650,
    }
  }

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): Point {
    return pointFromClient(event.clientX, event.clientY)
  }

  function eraseAt(point: Point) {
    const radius = Math.max(18, width * 2.2)
    const radiusSq = radius * radius
    const current = strokesRef.current
    const next = current.filter(stroke => !stroke.points.some(p => {
      const dx = p.x - point.x
      const dy = p.y - point.y
      return dx * dx + dy * dy <= radiusSq
    }))
    if (next.length !== current.length) setStrokeState(next)
  }

  function flushScheduledWork() {
    animationFrameRef.current = null

    if (tool === 'eraser') {
      const point = latestErasePointRef.current
      latestErasePointRef.current = null
      if (point) eraseAt(point)
      return
    }

    const activeId = activeStrokeIdRef.current
    const queued = pendingPointsRef.current
    if (activeId == null || queued.length === 0) return
    pendingPointsRef.current = []
    setStrokeState(current => current.map(stroke => stroke.id === activeId ? { ...stroke, points: [...stroke.points, ...queued] } : stroke))
  }

  function scheduleFlush() {
    if (animationFrameRef.current != null) return
    animationFrameRef.current = requestAnimationFrame(flushScheduledWork)
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    snapshot()

    const point = pointFromEvent(event)
    lastPointRef.current = point

    if (tool === 'eraser') {
      latestErasePointRef.current = point
      scheduleFlush()
      return
    }

    const id = Date.now() + Math.random()
    activeStrokeIdRef.current = id
    const next = [...strokesRef.current, { id, points: [point], color, width }]
    setStrokeState(next)
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return
    event.preventDefault()

    const nativeEvent = event.nativeEvent
    const coalesced = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [nativeEvent]

    if (tool === 'eraser') {
      const last = coalesced[coalesced.length - 1]
      latestErasePointRef.current = pointFromClient(last.clientX, last.clientY)
      scheduleFlush()
      return
    }

    for (const item of coalesced) {
      const point = pointFromClient(item.clientX, item.clientY)
      const last = lastPointRef.current
      if (last) {
        const dx = point.x - last.x
        const dy = point.y - last.y
        if (dx * dx + dy * dy < 2.25) continue
      }
      lastPointRef.current = point
      pendingPointsRef.current.push(point)
    }
    scheduleFlush()
  }

  function endDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      flushScheduledWork()
    }
    drawingRef.current = false
    activeStrokeIdRef.current = null
    pendingPointsRef.current = []
    latestErasePointRef.current = null
    lastPointRef.current = null
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* pointer capture may already be released */ }
  }

  function undo() {
    if (!canUndo) return
    const previous = undoStack[undoStack.length - 1]
    setRedoStack(stack => [...stack, cloneStrokes(strokesRef.current)])
    setStrokeState(previous)
    setUndoStack(stack => stack.slice(0, -1))
  }

  function redo() {
    if (!canRedo) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(stack => [...stack, cloneStrokes(strokesRef.current)])
    setStrokeState(next)
    setRedoStack(stack => stack.slice(0, -1))
  }

  function clearBoard() {
    if (!strokesRef.current.length) return
    snapshot()
    setStrokeState([])
  }

  const toolButton = (active = false): React.CSSProperties => ({
    width: 44,
    height: 44,
    border: 0,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: active ? '#eef0ff' : 'transparent',
    color: active ? '#4f6df5' : '#525866',
    cursor: 'pointer',
  })

  return <div style={{ position: 'relative' }}>
    <div style={{
      position: 'relative',
      minHeight: 560,
      border: '1px solid #e6e8ec',
      borderRadius: 22,
      overflow: 'hidden',
      background: '#f8f9fb',
      boxShadow: '0 18px 40px rgba(38, 43, 52, .08)',
    }}>
      <div style={{
        position: 'absolute',
        zIndex: 3,
        top: 18,
        left: 18,
        display: 'grid',
        gap: 6,
        padding: 8,
        borderRadius: 16,
        background: 'rgba(255,255,255,.96)',
        border: '1px solid #e7e9ee',
        boxShadow: '0 10px 28px rgba(34, 40, 49, .12)',
        backdropFilter: 'blur(10px)',
      }}>
        <button title="Стилус" aria-label="Стилус" style={toolButton(tool === 'pen')} onClick={() => setTool('pen')}><Brush size={21} /></button>
        <button title="Ластик" aria-label="Ластик" style={toolButton(tool === 'eraser')} onClick={() => setTool('eraser')}><Eraser size={21} /></button>
        <div style={{ height: 1, background: '#eceef2', margin: '2px 4px' }} />
        <button title="Отменить" aria-label="Отменить" style={{ ...toolButton(), opacity: canUndo ? 1 : .35 }} disabled={!canUndo} onClick={undo}><RotateCcw size={20} /></button>
        <button title="Вернуть" aria-label="Вернуть" style={{ ...toolButton(), opacity: canRedo ? 1 : .35 }} disabled={!canRedo} onClick={redo}><RotateCw size={20} /></button>
        <button title="Очистить доску" aria-label="Очистить доску" style={{ ...toolButton(), color: '#d04f4f' }} onClick={clearBoard}><Trash2 size={20} /></button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1200 650"
        width="100%"
        style={{
          display: 'block',
          height: 'min(72vh, 680px)',
          minHeight: 560,
          touchAction: 'none',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle, #dfe3ea 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrawing}
        onPointerCancel={endDrawing}
        onPointerLeave={event => { if (drawingRef.current && event.buttons === 0) endDrawing(event) }}
        aria-label="Интерактивная учебная доска"
      >
        {strokes.map(stroke => <StrokePath key={stroke.id} stroke={stroke} />)}
      </svg>

      <div style={{
        position: 'absolute',
        zIndex: 3,
        left: '50%',
        bottom: 18,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 12px',
        borderRadius: 16,
        background: 'rgba(255,255,255,.96)',
        border: '1px solid #e7e9ee',
        boxShadow: '0 10px 28px rgba(34, 40, 49, .12)',
        backdropFilter: 'blur(10px)',
      }}>
        {palette.map(item => <button key={item} aria-label={`Цвет ${item}`} onClick={() => { setColor(item); setTool('pen') }} style={{
          width: 27,
          height: 27,
          padding: 0,
          borderRadius: '50%',
          border: color === item ? '3px solid #fff' : '2px solid #fff',
          outline: color === item ? '2px solid #4f6df5' : '1px solid #dfe2e8',
          background: item,
          cursor: 'pointer',
        }} />)}
        <input aria-label="Свой цвет" type="color" value={color} onChange={e => { setColor(e.target.value); setTool('pen') }} style={{ width: 30, height: 30, border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }} />
        <div style={{ width: 1, height: 26, background: '#e8eaf0', margin: '0 2px' }} />
        <select aria-label="Толщина линии" value={width} onChange={e => setWidth(Number(e.target.value))} style={{
          border: 0,
          background: '#f4f6f8',
          borderRadius: 10,
          padding: '8px 10px',
          color: '#414754',
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          {widths.map(item => <option value={item} key={item}>{item}px</option>)}
        </select>
      </div>
    </div>

    <p style={{ margin: '10px 2px 0', color: '#8a909a', fontSize: 12 }}>
      Доска работает в новом визуальном стиле: свободный холст, плавающая панель инструментов и компактные настройки рисования.
    </p>
  </div>
}
