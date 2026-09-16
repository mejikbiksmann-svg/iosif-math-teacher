import { useMemo, useRef, useState } from 'react'

type Point = { x: number; y: number }
type Stroke = { id: number; points: Point[]; color: string; width: number }
type Tool = 'pen' | 'eraser'

const palette = ['#1f2937', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#f59e0b']
const widths = [2, 4, 8, 12]

export function Whiteboard() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingRef = useRef(false)
  const activeStrokeIdRef = useRef<number | null>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#1f2937')
  const [width, setWidth] = useState(4)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [undoStack, setUndoStack] = useState<Stroke[][]>([])
  const [redoStack, setRedoStack] = useState<Stroke[][]>([])

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0
  const pathFor = useMemo(() => (points: Point[]) => {
    if (!points.length) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [])

  function snapshot() {
    setUndoStack(stack => [...stack, strokes.map(s => ({ ...s, points: s.points.map(p => ({ ...p })) }))])
    setRedoStack([])
  }

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1200,
      y: ((event.clientY - rect.top) / rect.height) * 650,
    }
  }

  function eraseNear(point: Point) {
    const radius = Math.max(14, width * 2)
    setStrokes(current => current.filter(stroke => !stroke.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) <= radius)))
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    snapshot()
    const point = pointFromEvent(event)
    if (tool === 'eraser') {
      eraseNear(point)
      return
    }
    const id = Date.now()
    activeStrokeIdRef.current = id
    setStrokes(current => [...current, { id, points: [point], color, width }])
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return
    const point = pointFromEvent(event)
    if (tool === 'eraser') {
      eraseNear(point)
      return
    }
    const activeId = activeStrokeIdRef.current
    if (activeId == null) return
    setStrokes(current => current.map(stroke => stroke.id === activeId ? { ...stroke, points: [...stroke.points, point] } : stroke))
  }

  function endDrawing(event: React.PointerEvent<SVGSVGElement>) {
    drawingRef.current = false
    activeStrokeIdRef.current = null
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* pointer capture may already be released */ }
  }

  function undo() {
    if (!canUndo) return
    const previous = undoStack[undoStack.length - 1]
    setRedoStack(stack => [...stack, strokes])
    setStrokes(previous)
    setUndoStack(stack => stack.slice(0, -1))
  }

  function redo() {
    if (!canRedo) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(stack => [...stack, strokes])
    setStrokes(next)
    setRedoStack(stack => stack.slice(0, -1))
  }

  function clearBoard() {
    if (!strokes.length) return
    snapshot()
    setStrokes([])
  }

  const buttonStyle = (active = false): React.CSSProperties => ({
    border: '1px solid #d8d5cc',
    background: active ? '#244d42' : '#fff',
    color: active ? '#fff' : '#33413c',
    padding: '9px 12px',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer',
  })

  return <div style={{ display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 10, background: '#fff', border: '1px solid #e0ded6', borderRadius: 14 }}>
      <button style={buttonStyle(tool === 'pen')} onClick={() => setTool('pen')}>Стилус</button>
      <button style={buttonStyle(tool === 'eraser')} onClick={() => setTool('eraser')}>Ластик</button>
      <span style={{ width: 1, height: 28, background: '#e5e2da' }} />
      {palette.map(item => <button key={item} aria-label={`Цвет ${item}`} onClick={() => { setColor(item); setTool('pen') }} style={{ width: 30, height: 30, padding: 0, borderRadius: '50%', border: color === item ? '3px solid #244d42' : '2px solid #fff', boxShadow: '0 0 0 1px #d8d5cc', background: item, cursor: 'pointer' }} />)}
      <input aria-label="Свой цвет" type="color" value={color} onChange={e => { setColor(e.target.value); setTool('pen') }} style={{ width: 38, height: 34, border: 0, background: 'transparent', padding: 0 }} />
      <select aria-label="Толщина линии" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ padding: '9px 10px', border: '1px solid #d8d5cc', borderRadius: 10, background: '#fff' }}>
        {widths.map(item => <option value={item} key={item}>{item}px</option>)}
      </select>
      <span style={{ flex: 1 }} />
      <button style={{ ...buttonStyle(), opacity: canUndo ? 1 : .45 }} disabled={!canUndo} onClick={undo}>Отменить</button>
      <button style={{ ...buttonStyle(), opacity: canRedo ? 1 : .45 }} disabled={!canRedo} onClick={redo}>Вернуть</button>
      <button style={{ ...buttonStyle(), color: '#a33b2f' }} onClick={clearBoard}>Очистить</button>
    </div>

    <div style={{ border: '1px solid #d9d6cd', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 24px rgba(43,56,49,.06)' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 1200 650"
        width="100%"
        style={{ display: 'block', height: 'min(68vh, 650px)', minHeight: 430, touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair', backgroundColor: '#fff', backgroundImage: 'linear-gradient(#edf0ed 1px, transparent 1px), linear-gradient(90deg, #edf0ed 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrawing}
        onPointerCancel={endDrawing}
        onPointerLeave={event => { if (drawingRef.current && event.buttons === 0) endDrawing(event) }}
        aria-label="Интерактивная учебная доска"
      >
        {strokes.map(stroke => <path key={stroke.id} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
    </div>
    <p style={{ margin: 0, color: '#7e8985', fontSize: 12 }}>Этап 1: стилус, цвета, толщина линии, ластик, отмена/возврат и очистка. Следующими этапами добавим объекты, изображения, масштабирование, фреймы, фигуры, текст, совместную работу и остальные возможности UniDraw.</p>
  </div>
}
