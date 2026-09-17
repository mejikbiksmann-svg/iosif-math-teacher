type PointerInfo = {
  kind: string
  pointerType: string
  width: number
  height: number
  pressure: number
  tiltX: number
  tiltY: number
  tangentialPressure: number
  twist: number
}

function makeBadge() {
  let badge = document.getElementById('pointer-diagnostics-badge') as HTMLDivElement | null
  if (badge) return badge
  badge = document.createElement('div')
  badge.id = 'pointer-diagnostics-badge'
  Object.assign(badge.style, {
    position: 'fixed',
    right: '10px',
    bottom: '10px',
    zIndex: '99999',
    maxWidth: '92vw',
    padding: '8px 10px',
    borderRadius: '10px',
    background: 'rgba(20,20,24,.88)',
    color: '#fff',
    font: '12px/1.35 system-ui, sans-serif',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
  })
  badge.textContent = 'Диагностика ввода: коснись доски пальцем и стилусом'
  document.body.appendChild(badge)
  return badge
}

export function installPointerDiagnostics() {
  if (typeof window === 'undefined') return
  const show = (event: PointerEvent) => {
    const target = event.target as Element | null
    if (!target?.closest('svg[aria-label="Интерактивная учебная доска"]')) return
    const info: PointerInfo = {
      kind: event.pointerType === 'pen' ? 'СТИЛУС/pen' : event.pointerType === 'touch' ? 'TOUCH' : event.pointerType || 'unknown',
      pointerType: event.pointerType,
      width: Number(event.width.toFixed(2)),
      height: Number(event.height.toFixed(2)),
      pressure: Number(event.pressure.toFixed(3)),
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      tangentialPressure: Number((event.tangentialPressure || 0).toFixed(3)),
      twist: event.twist || 0,
    }
    makeBadge().textContent = `${info.kind}  type=${info.pointerType}  size=${info.width}×${info.height}  pressure=${info.pressure}  tilt=${info.tiltX}/${info.tiltY}  tang=${info.tangentialPressure}  twist=${info.twist}`
  }
  window.addEventListener('pointerdown', show, true)
  window.addEventListener('pointermove', show, true)
}
