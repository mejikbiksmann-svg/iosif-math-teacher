import { memo, useRef, useState } from 'react'
import { Brush, Circle, Eraser, ImagePlus, Minus, MousePointer2, MoveRight, RotateCcw, RotateCw, Square, Trash2, Type } from 'lucide-react'

type Point = { x: number; y: number }
type Stroke = { id: number; points: Point[]; color: string; width: number }
type ShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'image'
type Shape = {
  id: number
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  rotation: number
  color: string
  width: number
  text?: string
  src?: string
  aspectRatio?: number
}
type Tool = 'select' | 'pen' | 'eraser' | Exclude<ShapeKind, 'image'>
type BoardState = { strokes: Stroke[]; shapes: Shape[] }
type Interaction =
  | { mode: 'draw-shape'; id: number; start: Point }
  | { mode: 'move'; id: number; start: Point; originX: number; originY: number }
  | { mode: 'resize'; id: number; start: Point; originW: number; originH: number; aspectRatio?: number }
  | { mode: 'rotate'; id: number; center: Point; startAngle: number; originRotation: number }
  | null

const palette = ['#202124', '#4f6df5', '#ef5b5b', '#22a06b', '#8b5cf6', '#f5a524']
const widths = [2, 4, 8, 12]

function pathFor(points: Point[]) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function pointSegmentDistanceSq(point: Point, a: Point, b: Point) {
  const abX = b.x - a.x
  const abY = b.y - a.y
  const lengthSq = abX * abX + abY * abY
  if (lengthSq === 0) {
    const dx = point.x - a.x
    const dy = point.y - a.y
    return dx * dx + dy * dy
  }
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abX + (point.y - a.y) * abY) / lengthSq))
  const x = a.x + t * abX
  const y = a.y + t * abY
  const dx = point.x - x
  const dy = point.y - y
  return dx * dx + dy * dy
}

const StrokePath = memo(function StrokePath({ stroke }: { stroke: Stroke }) {
  return <path d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
})

function cloneBoard(state: BoardState): BoardState {
  return {
    strokes: state.strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ ...point })) })),
    shapes: state.shapes.map(shape => ({ ...shape })),
  }
}

export function Whiteboard() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const drawingRef = useRef(false)
  const activeStrokeIdRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<Point[]>([])
  const pendingErasePointsRef = useRef<Point[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const lastPointRef = useRef<Point | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const shapesRef = useRef<Shape[]>([])
  const interactionRef = useRef<Interaction>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#202124')
  const [width, setWidth] = useState(4)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [undoStack, setUndoStack] = useState<BoardState[]>([])
  const [redoStack, setRedoStack] = useState<BoardState[]>([])
  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  function setStrokeState(next: Stroke[] | ((current: Stroke[]) => Stroke[])) {
    setStrokes(current => {
      const value = typeof next === 'function' ? next(current) : next
      strokesRef.current = value
      return value
    })
  }

  function setShapeState(next: Shape[] | ((current: Shape[]) => Shape[])) {
    setShapes(current => {
      const value = typeof next === 'function' ? next(current) : next
      shapesRef.current = value
      return value
    })
  }

  function currentBoard(): BoardState { return { strokes: strokesRef.current, shapes: shapesRef.current } }
  function snapshot() { setUndoStack(stack => [...stack, cloneBoard(currentBoard())]); setRedoStack([]) }

  function pointFromClient(clientX: number, clientY: number): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const matrix = svg.getScreenCTM()
    if (matrix) {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      const transformed = point.matrixTransform(matrix.inverse())
      return { x: transformed.x, y: transformed.y }
    }
    const rect = svg.getBoundingClientRect()
    return { x: ((clientX - rect.left) / rect.width) * 1200, y: ((clientY - rect.top) / rect.height) * 650 }
  }

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): Point { return pointFromClient(event.clientX, event.clientY) }

  function strokeTouchesEraser(stroke: Stroke, point: Point, radiusSq: number) {
    if (stroke.points.length === 1) {
      const dx = stroke.points[0].x - point.x
      const dy = stroke.points[0].y - point.y
      return dx * dx + dy * dy <= radiusSq
    }
    for (let i = 1; i < stroke.points.length; i += 1) {
      if (pointSegmentDistanceSq(point, stroke.points[i - 1], stroke.points[i]) <= radiusSq) return true
    }
    return false
  }

  function eraseAtPoints(points: Point[]) {
    if (!points.length) return
    const radius = Math.max(28, width * 3)
    const radiusSq = radius * radius
    const current = strokesRef.current
    const next = current.filter(stroke => !points.some(point => strokeTouchesEraser(stroke, point, radiusSq)))
    if (next.length !== current.length) setStrokeState(next)
  }

  function queueErasePoint(point: Point) {
    const previous = lastPointRef.current
    if (!previous) {
      pendingErasePointsRef.current.push(point)
      lastPointRef.current = point
      return
    }
    const dx = point.x - previous.x
    const dy = point.y - previous.y
    const distance = Math.hypot(dx, dy)
    const step = 10
    const count = Math.max(1, Math.ceil(distance / step))
    for (let i = 1; i <= count; i += 1) {
      const t = i / count
      pendingErasePointsRef.current.push({ x: previous.x + dx * t, y: previous.y + dy * t })
    }
    lastPointRef.current = point
  }

  function flushScheduledWork() {
    animationFrameRef.current = null
    if (tool === 'eraser') {
      const points = pendingErasePointsRef.current
      pendingErasePointsRef.current = []
      eraseAtPoints(points)
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

  function makeShape(kind: Exclude<ShapeKind, 'image'>, point: Point): Shape {
    return { id: Date.now() + Math.random(), kind, x: point.x, y: point.y, w: 1, h: 1, rotation: 0, color, width, text: kind === 'text' ? 'Текст' : undefined }
  }

  function addImage(src: string, preferredPoint?: Point) {
    const image = new Image()
    image.onload = () => {
      snapshot()
      const maxW = 420
      const maxH = 300
      const ratio = image.naturalWidth / Math.max(1, image.naturalHeight)
      let w = Math.min(maxW, image.naturalWidth || maxW)
      let h = w / ratio
      if (h > maxH) { h = maxH; w = h * ratio }
      const center = preferredPoint ?? { x: 600, y: 325 }
      const shape: Shape = {
        id: Date.now() + Math.random(), kind: 'image', src, aspectRatio: ratio,
        x: Math.max(10, center.x - w / 2), y: Math.max(10, center.y - h / 2),
        w, h, rotation: 0, color: '#4f6df5', width: 2,
      }
      setShapeState(current => [...current, shape])
      setSelectedId(shape.id)
      setTool('select')
    }
    image.src = src
  }

  function loadImageFile(file: File, preferredPoint?: Point) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' && addImage(reader.result, preferredPoint)
    reader.readAsDataURL(file)
  }

  function handleImageInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) loadImageFile(file)
    event.target.value = ''
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = Array.from(event.dataTransfer.files).find(item => item.type.startsWith('image/'))
    if (!file) return
    loadImageFile(file, pointFromClient(event.clientX, event.clientY))
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'))
    if (file) { event.preventDefault(); loadImageFile(file) }
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'pen' && event.pointerType === 'touch') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    if (tool === 'select') { setSelectedId(null); interactionRef.current = null; return }
    if (tool === 'text') {
      const value = window.prompt('Введите текст')
      if (!value) return
      snapshot()
      const shape = makeShape('text', point)
      shape.text = value; shape.w = Math.max(120, value.length * 18); shape.h = 42
      setShapeState(current => [...current, shape]); setSelectedId(shape.id); setTool('select'); return
    }
    if (tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'ellipse') {
      snapshot()
      const shape = makeShape(tool, point)
      setShapeState(current => [...current, shape])
      interactionRef.current = { mode: 'draw-shape', id: shape.id, start: point }
      setSelectedId(shape.id)
      return
    }
    drawingRef.current = true
    snapshot()
    lastPointRef.current = point
    if (tool === 'eraser') { pendingErasePointsRef.current = [point]; scheduleFlush(); return }
    const id = Date.now() + Math.random()
    activeStrokeIdRef.current = id
    setStrokeState([...strokesRef.current, { id, points: [point], color, width }])
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const point = pointFromEvent(event)
    const interaction = interactionRef.current
    if (interaction) {
      event.preventDefault()
      if (interaction.mode === 'draw-shape') {
        setShapeState(current => current.map(shape => shape.id === interaction.id ? { ...shape, x: Math.min(interaction.start.x, point.x), y: Math.min(interaction.start.y, point.y), w: Math.max(1, Math.abs(point.x - interaction.start.x)), h: Math.max(1, Math.abs(point.y - interaction.start.y)) } : shape))
      } else if (interaction.mode === 'move') {
        const dx = point.x - interaction.start.x; const dy = point.y - interaction.start.y
        setShapeState(current => current.map(shape => shape.id === interaction.id ? { ...shape, x: interaction.originX + dx, y: interaction.originY + dy } : shape))
      } else if (interaction.mode === 'resize') {
        const dx = point.x - interaction.start.x
        let nextW = Math.max(24, interaction.originW + dx)
        let nextH = interaction.aspectRatio ? nextW / interaction.aspectRatio : Math.max(24, interaction.originH + (point.y - interaction.start.y))
        if (interaction.aspectRatio && nextH < 24) { nextH = 24; nextW = nextH * interaction.aspectRatio }
        setShapeState(current => current.map(shape => shape.id === interaction.id ? { ...shape, w: nextW, h: nextH } : shape))
      } else if (interaction.mode === 'rotate') {
        const angle = Math.atan2(point.y - interaction.center.y, point.x - interaction.center.x) * 180 / Math.PI
        setShapeState(current => current.map(shape => shape.id === interaction.id ? { ...shape, rotation: interaction.originRotation + angle - interaction.startAngle } : shape))
      }
      return
    }
    if (!drawingRef.current) return
    event.preventDefault()
    const nativeEvent = event.nativeEvent
    const coalesced = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [nativeEvent]
    if (tool === 'eraser') {
      for (const item of coalesced) queueErasePoint(pointFromClient(item.clientX, item.clientY))
      scheduleFlush(); return
    }
    for (const item of coalesced) {
      const nextPoint = pointFromClient(item.clientX, item.clientY)
      const last = lastPointRef.current
      if (last) { const dx = nextPoint.x - last.x; const dy = nextPoint.y - last.y; if (dx * dx + dy * dy < 2.25) continue }
      lastPointRef.current = nextPoint
      pendingPointsRef.current.push(nextPoint)
    }
    scheduleFlush()
  }

  function endDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (animationFrameRef.current != null) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; flushScheduledWork() }
    drawingRef.current = false; activeStrokeIdRef.current = null; pendingPointsRef.current = []; pendingErasePointsRef.current = []; lastPointRef.current = null; interactionRef.current = null
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* capture may already be released */ }
  }

  function beginMove(event: React.PointerEvent<SVGGElement>, shape: Shape) {
    if (tool !== 'select') return
    event.stopPropagation(); event.preventDefault(); snapshot(); setSelectedId(shape.id)
    interactionRef.current = { mode: 'move', id: shape.id, start: pointFromClient(event.clientX, event.clientY), originX: shape.x, originY: shape.y }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function beginResize(event: React.PointerEvent<SVGCircleElement>, shape: Shape) {
    event.stopPropagation(); event.preventDefault(); snapshot()
    interactionRef.current = { mode: 'resize', id: shape.id, start: pointFromClient(event.clientX, event.clientY), originW: shape.w, originH: shape.h, aspectRatio: shape.kind === 'image' ? shape.aspectRatio : undefined }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function beginRotate(event: React.PointerEvent<SVGCircleElement>, shape: Shape) {
    event.stopPropagation(); event.preventDefault(); snapshot()
    const center = { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 }
    const point = pointFromClient(event.clientX, event.clientY)
    interactionRef.current = { mode: 'rotate', id: shape.id, center, startAngle: Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI, originRotation: shape.rotation }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function undo() {
    if (!canUndo) return
    const previous = undoStack[undoStack.length - 1]
    setRedoStack(stack => [...stack, cloneBoard(currentBoard())]); setStrokeState(previous.strokes); setShapeState(previous.shapes); setSelectedId(null); setUndoStack(stack => stack.slice(0, -1))
  }
  function redo() {
    if (!canRedo) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(stack => [...stack, cloneBoard(currentBoard())]); setStrokeState(next.strokes); setShapeState(next.shapes); setSelectedId(null); setRedoStack(stack => stack.slice(0, -1))
  }
  function clearBoard() { if (!strokesRef.current.length && !shapesRef.current.length) return; snapshot(); setStrokeState([]); setShapeState([]); setSelectedId(null) }
  function deleteSelected() { if (selectedId == null) return; snapshot(); setShapeState(current => current.filter(shape => shape.id !== selectedId)); setSelectedId(null) }

  const toolButton = (active = false): React.CSSProperties => ({ width: 44, height: 44, border: 0, borderRadius: 12, display: 'grid', placeItems: 'center', background: active ? '#eef0ff' : 'transparent', color: active ? '#4f6df5' : '#525866', cursor: 'pointer' })

  function renderShape(shape: Shape) {
    const selected = selectedId === shape.id
    const cx = shape.x + shape.w / 2; const cy = shape.y + shape.h / 2
    const transform = `rotate(${shape.rotation} ${cx} ${cy})`
    const common = { stroke: shape.color, strokeWidth: shape.width, fill: 'transparent', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    return <g key={shape.id} transform={transform} onPointerDown={event => beginMove(event, shape)} style={{ cursor: tool === 'select' ? 'move' : 'default' }}>
      {shape.kind === 'rect' && <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={8} {...common} />}
      {shape.kind === 'ellipse' && <ellipse cx={cx} cy={cy} rx={shape.w / 2} ry={shape.h / 2} {...common} />}
      {shape.kind === 'line' && <line x1={shape.x} y1={shape.y} x2={shape.x + shape.w} y2={shape.y + shape.h} {...common} />}
      {shape.kind === 'arrow' && <><line x1={shape.x} y1={shape.y} x2={shape.x + shape.w} y2={shape.y + shape.h} {...common} /><path d={`M ${shape.x + shape.w} ${shape.y + shape.h} l -18 -8 m 18 8 l -8 -18`} {...common} /></>}
      {shape.kind === 'text' && <text x={shape.x} y={shape.y + Math.min(shape.h, 34)} fill={shape.color} fontSize={30} fontFamily="Inter, system-ui, sans-serif" stroke="none">{shape.text}</text>}
      {shape.kind === 'image' && shape.src && <image href={shape.src} x={shape.x} y={shape.y} width={shape.w} height={shape.h} preserveAspectRatio="none" />}
      {selected && <>
        <rect x={shape.x - 8} y={shape.y - 8} width={shape.w + 16} height={shape.h + 16} fill="none" stroke="#4f6df5" strokeWidth={2} strokeDasharray="7 5" rx={8} />
        <line x1={cx} y1={shape.y - 8} x2={cx} y2={shape.y - 34} stroke="#4f6df5" strokeWidth={2} />
        <circle cx={cx} cy={shape.y - 42} r={8} fill="#fff" stroke="#4f6df5" strokeWidth={3} onPointerDown={event => beginRotate(event, shape)} style={{ cursor: 'grab' }} />
        <circle cx={shape.x + shape.w + 8} cy={shape.y + shape.h + 8} r={9} fill="#fff" stroke="#4f6df5" strokeWidth={3} onPointerDown={event => beginResize(event, shape)} style={{ cursor: 'nwse-resize' }} />
      </>}
    </g>
  }

  return <div style={{ position: 'relative' }} onDragOver={event => event.preventDefault()} onDrop={handleDrop} onPaste={handlePaste} tabIndex={0}>
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageInput} style={{ display: 'none' }} />
    <div style={{ position: 'relative', minHeight: 560, border: '1px solid #e6e8ec', borderRadius: 22, overflow: 'hidden', background: '#f8f9fb', boxShadow: '0 18px 40px rgba(38, 43, 52, .08)' }}>
      <div style={{ position: 'absolute', zIndex: 3, top: 18, left: 18, display: 'grid', gap: 6, padding: 8, borderRadius: 16, background: 'rgba(255,255,255,.96)', border: '1px solid #e7e9ee', boxShadow: '0 10px 28px rgba(34, 40, 49, .12)', backdropFilter: 'blur(10px)' }}>
        <button title="Выделение" aria-label="Выделение" style={toolButton(tool === 'select')} onClick={() => setTool('select')}><MousePointer2 size={21} /></button>
        <button title="Стилус" aria-label="Стилус" style={toolButton(tool === 'pen')} onClick={() => setTool('pen')}><Brush size={21} /></button>
        <button title="Ластик" aria-label="Ластик" style={toolButton(tool === 'eraser')} onClick={() => setTool('eraser')}><Eraser size={21} /></button>
        <div style={{ height: 1, background: '#eceef2', margin: '2px 4px' }} />
        <button title="Добавить изображение" aria-label="Добавить изображение" style={toolButton()} onClick={() => fileInputRef.current?.click()}><ImagePlus size={21} /></button>
        <button title="Текст" aria-label="Текст" style={toolButton(tool === 'text')} onClick={() => setTool('text')}><Type size={21} /></button>
        <button title="Линия" aria-label="Линия" style={toolButton(tool === 'line')} onClick={() => setTool('line')}><Minus size={21} /></button>
        <button title="Стрелка" aria-label="Стрелка" style={toolButton(tool === 'arrow')} onClick={() => setTool('arrow')}><MoveRight size={21} /></button>
        <button title="Прямоугольник" aria-label="Прямоугольник" style={toolButton(tool === 'rect')} onClick={() => setTool('rect')}><Square size={21} /></button>
        <button title="Эллипс" aria-label="Эллипс" style={toolButton(tool === 'ellipse')} onClick={() => setTool('ellipse')}><Circle size={21} /></button>
        <div style={{ height: 1, background: '#eceef2', margin: '2px 4px' }} />
        <button title="Отменить" aria-label="Отменить" style={{ ...toolButton(), opacity: canUndo ? 1 : .35 }} disabled={!canUndo} onClick={undo}><RotateCcw size={20} /></button>
        <button title="Вернуть" aria-label="Вернуть" style={{ ...toolButton(), opacity: canRedo ? 1 : .35 }} disabled={!canRedo} onClick={redo}><RotateCw size={20} /></button>
        <button title={selectedId == null ? 'Очистить доску' : 'Удалить выбранное'} aria-label={selectedId == null ? 'Очистить доску' : 'Удалить выбранное'} style={{ ...toolButton(), color: '#d04f4f' }} onClick={selectedId == null ? clearBoard : deleteSelected}><Trash2 size={20} /></button>
      </div>

      <svg ref={svgRef} viewBox="0 0 1200 650" preserveAspectRatio="none" width="100%" style={{ display: 'block', height: 'min(72vh, 680px)', minHeight: 560, touchAction: tool === 'pen' ? 'pan-y' : 'none', cursor: tool === 'eraser' ? 'cell' : tool === 'select' ? 'default' : 'crosshair', backgroundColor: '#ffffff', backgroundImage: 'radial-gradient(circle, #dfe3ea 1px, transparent 1px)', backgroundSize: '24px 24px' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={event => { if ((drawingRef.current || interactionRef.current) && event.buttons === 0) endDrawing(event) }} aria-label="Интерактивная учебная доска">
        {strokes.map(stroke => <StrokePath key={stroke.id} stroke={stroke} />)}
        {shapes.map(renderShape)}
      </svg>

      <div style={{ position: 'absolute', zIndex: 3, left: '50%', bottom: 18, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 16, background: 'rgba(255,255,255,.96)', border: '1px solid #e7e9ee', boxShadow: '0 10px 28px rgba(34, 40, 49, .12)', backdropFilter: 'blur(10px)' }}>
        {palette.map(item => <button key={item} aria-label={`Цвет ${item}`} onClick={() => { setColor(item); if (selectedId != null) setShapeState(current => current.map(shape => shape.id === selectedId && shape.kind !== 'image' ? { ...shape, color: item } : shape)) }} style={{ width: 27, height: 27, padding: 0, borderRadius: '50%', border: color === item ? '3px solid #fff' : '2px solid #fff', outline: color === item ? '2px solid #4f6df5' : '1px solid #dfe2e8', background: item, cursor: 'pointer' }} />)}
        <input aria-label="Свой цвет" type="color" value={color} onChange={e => { setColor(e.target.value); if (selectedId != null) setShapeState(current => current.map(shape => shape.id === selectedId && shape.kind !== 'image' ? { ...shape, color: e.target.value } : shape)) }} style={{ width: 30, height: 30, border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }} />
        <div style={{ width: 1, height: 26, background: '#e8eaf0', margin: '0 2px' }} />
        <select aria-label="Толщина линии" value={width} onChange={e => { const next = Number(e.target.value); setWidth(next); if (selectedId != null) setShapeState(current => current.map(shape => shape.id === selectedId && shape.kind !== 'image' ? { ...shape, width: next } : shape)) }} style={{ border: 0, background: '#f4f6f8', borderRadius: 10, padding: '8px 10px', color: '#414754', fontWeight: 700, cursor: 'pointer' }}>
          {widths.map(item => <option value={item} key={item}>{item}px</option>)}
        </select>
      </div>
    </div>
    <p style={{ margin: '10px 2px 0', color: '#8a909a', fontSize: 12 }}>Этап 3: изображения можно загрузить кнопкой, перетащить на доску или вставить из буфера. Картинки перемещаются, масштабируются с сохранением пропорций, вращаются и участвуют в undo/redo.</p>
  </div>
}