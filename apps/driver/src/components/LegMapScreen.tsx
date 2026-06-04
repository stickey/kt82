import { useRef, useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { lpEstimates, COURSE_LEGS, lerpAlongPolyline } from '@kt82/shared'

interface Props {
  runner: string
  town: string
  legN: number
  totalLegs: number
  distMiles: number
  startedAtMs: number
  raceStartedAtMs: number | null
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string
  onBack: () => void
}

const ACCENT = '#ff5a1f'

function lpPace(sec: number): string {
  const totalSec = Math.round(sec)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function lpClock(ms: number): { full: string; ap: string } {
  const d = new Date(ms)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return { full: `${h}:${m}`, ap: d.getHours() < 12 ? 'AM' : 'PM' }
}

function makeRunnerIcon(legTime: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:${ACCENT};border:3px solid #fff;
        box-shadow:0 0 8px rgba(255,90,31,0.7);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;line-height:1;
      ">🏃</div>
      <div style="
        position:absolute;top:32px;left:50%;transform:translateX(-50%);
        white-space:nowrap;
        background:rgba(19,17,10,0.88);border:1px solid rgba(255,90,31,0.5);border-radius:4px;
        padding:1px 5px;
        font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;
        color:#fbf6ee;letter-spacing:0.02em;
      ">${legTime}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const START_DOT = { radius: 6, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 1 }
const END_DOT   = { radius: 6, fillColor: '#e84040', color: '#fff', weight: 2, fillOpacity: 1 }

// Start label floats below the coordinate, centered horizontally
function makeStartIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      display:inline-block;
      transform:translate(-50%, 8px);
      background:#1d1810;border:2px solid #22c55e;border-radius:6px;
      padding:2px 7px;white-space:nowrap;
      font-family:'Hanken Grotesk',sans-serif;font-weight:800;font-size:10px;
      letter-spacing:0.06em;color:#fbf6ee;
    ">${label}</div>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

// Destination label floats above the coordinate, centered horizontally
function makeDestinationIcon(label: string, eta?: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      display:inline-block;
      transform:translate(-50%, calc(-100% - 6px));
      background:#1d1810;border:2px solid ${ACCENT};border-radius:6px;
      padding:2px 7px;white-space:nowrap;
      font-family:'Hanken Grotesk',sans-serif;font-weight:800;font-size:10px;
      letter-spacing:0.06em;color:#fbf6ee;
    ">${label}${eta ? `<span style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${ACCENT};letter-spacing:0.02em;margin-top:2px;">${eta}</span>` : ''}</div>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

export function LegMapScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, raceStartedAtMs, targetPaceSecPerMile, teamName, backLabel, onBack,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const runnerMarkerRef = useRef<L.Marker | null>(null)
  const rangeLineRef = useRef<L.Polyline | null>(null)
  const endMarkerRef = useRef<L.Marker | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const courseLeg = COURSE_LEGS.find(l => l.legNumber === legN)
  const routeCoords: [number, number][] = courseLeg?.routeCoords ?? [[0, 0], [0, 0]]
  const endLabel = courseLeg ? courseLeg.endName.split(' ').slice(0, 2).join(' ') : town

  // Initialize map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      dragging: false,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    L.polyline(routeCoords, { color: ACCENT, weight: 4, opacity: 0.85 }).addTo(map)

    if (courseLeg) {
      L.circleMarker([courseLeg.startLat, courseLeg.startLng], START_DOT).addTo(map)
      L.marker([courseLeg.startLat, courseLeg.startLng], {
        icon: makeStartIcon(courseLeg.startName.split(' ').slice(0, 2).join(' ')),
      }).addTo(map)
      L.circleMarker([courseLeg.endLat, courseLeg.endLng], END_DOT).addTo(map)
      endMarkerRef.current = L.marker([courseLeg.endLat, courseLeg.endLng], {
        icon: makeDestinationIcon(endLabel),
      }).addTo(map)
    }

    const bounds = L.latLngBounds(routeCoords)
    map.fitBounds(bounds, { paddingTopLeft: [20, 100], paddingBottomRight: [20, 160] })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      runnerMarkerRef.current = null
      rangeLineRef.current = null
      endMarkerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update runner position, range segment, and end marker ETA every tick
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)
    const targetPos = lerpAlongPolyline(routeCoords, ests[2].frac)
    const minPos = lerpAlongPolyline(routeCoords, ests[ests.length - 1].frac)
    const maxPos = lerpAlongPolyline(routeCoords, ests[0].frac)

    const legTime = fmtElapsed(nowMs - startedAtMs)
    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng(targetPos)
      runnerMarkerRef.current.setIcon(makeRunnerIcon(legTime))
    } else {
      runnerMarkerRef.current = L.marker(targetPos, { icon: makeRunnerIcon(legTime), zIndexOffset: 1000 }).addTo(map)
    }

    if (rangeLineRef.current) {
      rangeLineRef.current.setLatLngs([minPos, targetPos, maxPos])
    } else {
      rangeLineRef.current = L.polyline([minPos, targetPos, maxPos], {
        color: ACCENT, weight: 10, opacity: 0.25,
      }).addTo(map)
    }

    if (endMarkerRef.current) {
      const c = lpClock(ests[2].finishMs)
      endMarkerRef.current.setIcon(makeDestinationIcon(endLabel, `${c.full} ${c.ap}`))
    }
  }, [nowMs]) // eslint-disable-line react-hooks/exhaustive-deps

  // 1-second clock tick
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#13110a' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top chrome */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(19,17,10,0.85) 0%, rgba(19,17,10,0) 100%)',
        padding: '8px 18px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(251,246,238,0.7)',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12,
              letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44,
              display: 'flex', alignItems: 'center',
            }}
          >
            {backLabel}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {raceStartedAtMs !== null && (
              <div>
                <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.08em', color: 'rgba(251,246,238,0.4)' }}>RACE </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: 'rgba(251,246,238,0.85)' }}>{fmtElapsed(nowMs - raceStartedAtMs)}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.7)' }}>LIVE</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', color: ACCENT, textTransform: 'uppercase' }}>
            LEG {legN} OF {totalLegs} · {teamName.toUpperCase()}
          </div>
          <div className="font-display uppercase" style={{ fontSize: 38, lineHeight: 0.95, color: '#fbf6ee', marginTop: 5 }}>
            {runner}
          </div>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', color: 'rgba(251,246,238,0.6)', marginTop: 6 }}>
            → {town.toUpperCase()} · {distMiles.toFixed(1)} MI
          </div>
        </div>
      </div>

      {/* Bottom chrome — estimates table */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(to top, rgba(19,17,10,0.92) 0%, rgba(19,17,10,0) 100%)',
        padding: '40px 18px 20px',
      }}>
        <div style={{ display: 'flex', marginBottom: 4, paddingBottom: 5, borderBottom: '1px solid rgba(251,246,238,0.1)' }}>
          <span style={{ flex: '0 0 56px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.35)' }}>PACE</span>
          <span style={{ flex: 1, textAlign: 'right', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.35)' }}>ARRIVES</span>
          <span style={{ flex: '0 0 52px', textAlign: 'right', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.35)' }}>LEG TIME</span>
        </div>
        {ests.map((e, i) => {
          const isTarget = e.off === 0
          const c = lpClock(e.finishMs)
          return (
            <div key={e.off} style={{
              display: 'flex', alignItems: 'center', padding: '4px 0',
              borderBottom: i < ests.length - 1 ? '1px solid rgba(251,246,238,0.06)' : 'none',
            }}>
              <span style={{ flex: '0 0 56px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: isTarget ? ACCENT : 'rgba(251,246,238,0.75)' }}>
                {lpPace(e.p)}
              </span>
              <span style={{ flex: 1, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: isTarget ? ACCENT : 'rgba(251,246,238,0.75)' }}>
                {c.full}<span style={{ fontSize: 9, color: 'rgba(251,246,238,0.4)', marginLeft: 3 }}>{c.ap}</span>
              </span>
              <span style={{ flex: '0 0 52px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: isTarget ? ACCENT : 'rgba(251,246,238,0.75)' }}>
                {fmtElapsed(e.total * 1000)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
