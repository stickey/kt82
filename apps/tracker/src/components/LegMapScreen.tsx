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
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string
  onBack: () => void
}

const ACCENT = '#ff5a1f'

function makeRunnerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${ACCENT};border:3px solid #fff;
      box-shadow:0 0 8px rgba(255,90,31,0.7);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;line-height:1;
    ">🏃</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function makeEndpointIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#1d1810;border:2px solid ${ACCENT};border-radius:6px;
      padding:2px 7px;white-space:nowrap;
      font-family:'Hanken Grotesk',sans-serif;font-weight:800;font-size:10px;
      letter-spacing:0.06em;color:#fbf6ee;
    ">${label}</div>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

export function LegMapScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, targetPaceSecPerMile, teamName, backLabel, onBack,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const runnerMarkerRef = useRef<L.Marker | null>(null)
  const rangeLineRef = useRef<L.Polyline | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const courseLeg = COURSE_LEGS.find(l => l.legNumber === legN)
  const routeCoords: [number, number][] = courseLeg?.routeCoords ?? [[0, 0], [0, 0]]

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

    // Route polyline
    L.polyline(routeCoords, { color: ACCENT, weight: 4, opacity: 0.85 }).addTo(map)

    // Start marker
    if (courseLeg) {
      L.marker([courseLeg.startLat, courseLeg.startLng], {
        icon: makeEndpointIcon(courseLeg.startName.split(' ').slice(0, 2).join(' ')),
      }).addTo(map)
      L.marker([courseLeg.endLat, courseLeg.endLng], {
        icon: makeEndpointIcon(courseLeg.endName.split(' ').slice(0, 2).join(' ')),
      }).addTo(map)
    }

    // Fit to route with padding to leave room for chrome overlay
    const bounds = L.latLngBounds(routeCoords)
    map.fitBounds(bounds, { paddingTopLeft: [20, 100], paddingBottomRight: [20, 40] })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      runnerMarkerRef.current = null
      rangeLineRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update runner position and range segment every tick
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)
    const targetPos = lerpAlongPolyline(routeCoords, ests[2].frac)
    const minPos = lerpAlongPolyline(routeCoords, ests[ests.length - 1].frac)
    const maxPos = lerpAlongPolyline(routeCoords, ests[0].frac)

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng(targetPos)
    } else {
      runnerMarkerRef.current = L.marker(targetPos, { icon: makeRunnerIcon(), zIndexOffset: 1000 }).addTo(map)
    }

    if (rangeLineRef.current) {
      rangeLineRef.current.setLatLngs([minPos, targetPos, maxPos])
    } else {
      rangeLineRef.current = L.polyline([minPos, targetPos, maxPos], {
        color: ACCENT, weight: 10, opacity: 0.25,
      }).addTo(map)
    }
  }, [nowMs]) // eslint-disable-line react-hooks/exhaustive-deps

  // 1-second clock tick
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#13110a' }}>
      {/* Map fills full viewport */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Chrome overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(19,17,10,0.85) 0%, rgba(19,17,10,0) 100%)',
        padding: '8px 18px 32px',
      }}>
        {/* Top bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.7)' }}>LIVE</span>
          </div>
        </div>

        {/* Runner info */}
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
    </div>
  )
}
