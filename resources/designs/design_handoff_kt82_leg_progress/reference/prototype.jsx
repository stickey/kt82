/* KT82 interactive prototype — Tracker + Driver (Direction B)
   Self-contained: needs kt82-data.js, ios-frame.jsx, tweaks-panel.jsx.
   Exports window.KT82App (the shell). */

const { useState, useEffect, useRef } = React;
const P_DISP = "'Anton', sans-serif";
const P_BODY = "'Hanken Grotesk', sans-serif";
const P_MONO = "'JetBrains Mono', monospace";

function tokB(theme) {
  return theme === 'light'
    ? { bg:'#f4f0e7', panel:'#ffffff', panel2:'#faf6ec', line:'rgba(0,0,0,0.09)', line2:'rgba(0,0,0,0.05)',
        text:'#1a160f', mut:'#6f6759', faint:'#b0a795', accent:'#e8480f',
        green:'#0e9b52', red:'#dd3a23', amber:'#c47d12', ink:'#ffffff' }
    : { bg:'#13110a', panel:'#1d1810', panel2:'#241d12', line:'rgba(255,240,220,0.10)', line2:'rgba(255,240,220,0.055)',
        text:'#fbf6ee', mut:'#a99e8c', faint:'#6a6053', accent:'#ff5a1f',
        green:'#37d27a', red:'#ff4d2e', amber:'#ffae3b', ink:'#13110a' };
}
function tok(theme, accent) {
  const base = tokB(theme);
  return accent ? { ...base, accent } : base;
}
function statusColor(s, t) { return s === 'overdue' ? t.red : t.green; }
function statusText(s) { return s === 'overdue' ? 'BEHIND PACE' : s === 'ahead' ? 'AHEAD' : 'ON PACE'; }

function Avatar({ initials, color, ink, size = 34, dim }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: P_BODY, fontWeight: 800, fontSize: size * 0.36, letterSpacing: '0.02em',
      opacity: dim ? 0.55 : 1 }}>{initials}</div>
  );
}

function NavPin({ town, color, bg, ring }) {
  return (
    <a href={window.KT82.navUrl(town)} target="_blank" rel="noopener noreferrer"
      title={`Directions to ${town}`} onClick={(e) => e.stopPropagation()}
      style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
        background: bg, border: `1px solid ${ring}` }}>
      <svg width="14" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill={color} />
        <circle cx="12" cy="9" r="2.6" fill={bg} />
      </svg>
    </a>
  );
}

// hold-to-activate button with rising fill
function HoldButton({ label, holdLabel, holdMs = 1200, onComplete, color, ink, t, height = 78, fontSize = 30 }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const raf = useRef(null), start = useRef(null);
  const cancel = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null; start.current = null; setProgress(0); setHolding(false);
  };
  const begin = (e) => {
    e.preventDefault();
    setHolding(true); start.current = Date.now();
    const step = () => {
      const p = Math.min((Date.now() - start.current) / holdMs, 1);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { cancel(); onComplete && onComplete(); }
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  return (
    <div onPointerDown={begin} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: color, height,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        userSelect: 'none', touchAction: 'none', boxShadow: holding ? `0 0 0 2px ${color}` : 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${progress * 100}%`,
        background: 'rgba(255,255,255,0.26)', transition: 'height 0.04s linear' }} />
      <span style={{ position: 'relative', fontFamily: P_DISP, fontSize: holding ? fontSize * 0.72 : fontSize,
        letterSpacing: '0.04em', color: ink, textTransform: 'uppercase' }}>
        {holding ? (holdLabel || 'KEEP HOLDING…') : label}</span>
    </div>
  );
}

// ───────────────────────── Tracker: grid ─────────────────────────
function TrackerGrid({ teams, onSelect, onCourse, t, sinceSec }) {
  const K = window.KT82;
  const sorted = [...teams].sort((a, b) => b.done - a.done);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: P_BODY, paddingTop: 52 }}>
      <div style={{ padding: '10px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: P_DISP, fontSize: 50, lineHeight: 0.84, textTransform: 'uppercase' }}>{K.raceName}</div>
          <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 12, color: t.accent, marginTop: 6, letterSpacing: '0.08em' }}>{K.raceSub.toUpperCase()} · {K.raceDate.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
          <div className="a-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
          <span style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: t.mut }}>LIVE</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px 6px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>6 TEAMS ON COURSE</span>
        <span style={{ fontFamily: P_MONO, fontSize: 11, color: t.faint }}>updated {sinceSec}s ago</span>
      </div>
      <div style={{ padding: '4px 18px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((tm, idx) => {
          const c = K.fmt.clock(tm.eta);
          const sc = statusColor(tm.status, t);
          const lead = idx === 0;
          return (
            <button key={tm.id} onClick={() => onSelect(tm)}
              style={{ textAlign: 'left', background: t.panel, borderRadius: 18, overflow: 'hidden', padding: 0,
                border: `1px solid ${lead ? t.accent : t.line}`, display: 'flex', cursor: 'pointer', color: t.text }}>
              <div style={{ width: 6, background: sc, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    {lead && <span style={{ fontFamily: P_DISP, fontSize: 18, color: t.accent }}>1</span>}
                    <span style={{ fontFamily: P_DISP, fontSize: 28, lineHeight: 0.85, textTransform: 'uppercase',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.name}</span>
                  </div>
                  <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.08em',
                    color: t.ink, background: sc, padding: '3px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {statusText(tm.status)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontFamily: P_BODY, fontSize: 12.5, color: t.mut }}>
                    Leg {tm.leg} · {tm.runner.split(' ')[0]} <span style={{ color: t.faint }}>→</span> {tm.next}</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 16, color: sc }}>{c.full}</span>
                    <span style={{ fontFamily: P_MONO, fontSize: 10, color: t.mut }}> {c.ap}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 20, background: t.line, overflow: 'hidden' }}>
                    <div style={{ width: `${(tm.done / K.totalLegs) * 100}%`, height: '100%', background: sc, borderRadius: 20 }} />
                  </div>
                  <span style={{ fontFamily: P_MONO, fontSize: 11, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{tm.toGo} mi</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Tracker: course row ─────────────────────────
function CourseRow({ r, cur, t, last }) {
  const K = window.KT82, c = K.fmt.clock(r.arrival);
  const isNow = r.status === 'now', isDone = r.status === 'done', isNext = r.status === 'next';
  const isOnDeck = r.n === cur.n + 1;
  const sc = isNow ? statusColor(r.delta > 0 ? 'overdue' : 'on-pace', t) : t.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px',
      background: isNow ? (r.delta > 0 ? `${t.red}1f` : `${t.green}1f`) : 'transparent',
      borderRadius: isNow ? 14 : 0, borderBottom: last || isNow ? 'none' : `1px solid ${t.line2}` }}>
      <div style={{ fontFamily: P_DISP, fontSize: 26, lineHeight: 0.8, width: 30, textAlign: 'center',
        color: isNow ? sc : isNext ? t.faint : t.mut }}>{String(r.n).padStart(2, '0')}</div>
      <Avatar initials={r.runner.initials} size={36} color={isNow ? sc : t.panel2} ink={isNow ? t.ink : t.mut} dim={isNext} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', color: isNext ? t.mut : t.text }}>{r.runner.name}</span>
          {isDone && <span style={{ color: t.green, fontSize: 13, fontWeight: 800 }}>✓</span>}
          {isNow && <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.1em', color: t.ink, background: sc, padding: '2px 6px', borderRadius: 20 }}>LIVE</span>}
          {isOnDeck && <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: t.accent, border: `1px solid ${t.accent}`, padding: '1px 6px', borderRadius: 20 }}>ON DECK</span>}
        </div>
        <div style={{ fontFamily: P_BODY, fontSize: 12, color: t.faint, marginTop: 1 }}>{r.town} · {r.dist} mi</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 15, color: isNow ? sc : isNext ? t.mut : t.text }}>{isNext ? '~' : ''}{c.full}</div>
        <div style={{ fontFamily: P_MONO, fontSize: 9.5, color: t.faint, marginTop: 1, letterSpacing: '0.05em' }}>{c.ap}{isDone && r.delta != null ? ` · ${r.delta >= 0 ? '+' : ''}${r.delta}m` : ''}</div>
      </div>
      <NavPin town={r.town} color={isNow ? sc : t.mut} bg={t.panel2} ring={isNow ? sc : t.line} />
    </div>
  );
}

// ───────────────────────── Tracker: detail ─────────────────────────
function TrackerDetail({ team, onBack, onCourse, onArrival, t, tick }) {
  const K = window.KT82, TL = team.timeline, cur = TL.current;
  const c = K.fmt.clock(cur.arrival);
  const sc = statusColor(cur.delta > 0 ? 'overdue' : 'on-pace', t);
  const nextRow = TL.rows[cur.n] || null;
  const pct = Math.round((TL.milesDone / K.totalMiles) * 100);
  const raceSec = TL.raceElapsedSec + tick;
  const legSec = cur.elapsedSec + tick;
  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: team.name + ' — KT82', url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  }
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: P_BODY, paddingTop: 52 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 10px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.mut,
          fontFamily: P_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', padding: 0 }}>← ALL TEAMS</button>
        <button onClick={share} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.mut,
          fontFamily: P_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', padding: 0 }}>SHARE ↗</button>
      </div>

      <div style={{ padding: '4px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', color: t.accent }}>{K.raceName} · {K.raceSub.toUpperCase()}</div>
          <div style={{ fontFamily: P_DISP, fontSize: 48, lineHeight: 0.86, letterSpacing: '0.01em', marginTop: 8, textTransform: 'uppercase' }}>{team.name}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'center', background: t.accent, color: t.ink, borderRadius: 14, padding: '8px 14px 10px', minWidth: 58 }}>
          <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.12em', opacity: 0.85 }}>LEG</div>
          <div style={{ fontFamily: P_DISP, fontSize: 38, lineHeight: 0.8, marginTop: 2 }}>{cur.n}</div>
          <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 10, opacity: 0.85, marginTop: 2 }}>of {K.totalLegs}</div>
        </div>
      </div>

      {/* progress + total race time */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9 }}>
          <div>
            <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 26, lineHeight: 0.9 }}>{K.fmt.dur(raceSec)}</div>
            <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: t.mut, marginTop: 5 }}>TOTAL RACE TIME</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 16 }}>{TL.milesToGo}<span style={{ fontSize: 11, color: t.mut }}> mi to go</span></div>
            <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', color: t.faint, marginTop: 6 }}>{TL.milesDone} OF {K.totalMiles} MI DONE</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 20, background: t.line, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: t.accent, borderRadius: 20 }} />
        </div>
      </div>

      {/* hero */}
      <div style={{ margin: '0 18px', background: sc, color: t.ink, borderRadius: 22, overflow: 'hidden',
        boxShadow: t.bg === '#13110a' ? `0 14px 40px ${sc}40` : `0 14px 34px ${sc}33` }}>
        <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', opacity: 0.9 }}>NOW RUNNING · LEG {cur.n}</span>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 10.5, letterSpacing: '0.08em', background: 'rgba(0,0,0,0.18)', padding: '4px 9px', borderRadius: 20 }}>
            {cur.delta > 0 ? `${cur.delta} MIN BEHIND` : statusText('on-pace')}</span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontFamily: P_DISP, fontSize: 52, lineHeight: 0.88, textTransform: 'uppercase', letterSpacing: '0.005em' }}>{cur.runner.name}</div>
          <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.07em', opacity: 0.9, marginTop: 9 }}>→ HEADING TO {cur.town.toUpperCase()}</div>
        </div>
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <button onClick={onArrival} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: t.ink, textAlign: 'left' }}>
            <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 34, lineHeight: 0.9 }}>{c.full}<span style={{ fontSize: 16 }}> {c.ap}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <span style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 11, opacity: 0.85, letterSpacing: '0.06em' }}>EST. ARRIVAL</span>
              <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.06em', background: 'rgba(0,0,0,0.18)', padding: '2px 7px', borderRadius: 20 }}>BY PACE →</span>
            </div>
          </button>
          <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
            <div>
              <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 22, lineHeight: 0.95 }}>{K.fmt.dur(legSec)}</div>
              <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 10.5, opacity: 0.85, marginTop: 6, letterSpacing: '0.06em' }}>LEG TIME</div>
            </div>
            <div>
              <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 22, lineHeight: 0.95 }}>{cur.distLeft}<span style={{ fontSize: 12 }}> mi</span></div>
              <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 10.5, opacity: 0.85, marginTop: 6, letterSpacing: '0.06em' }}>TO GO</div>
            </div>
          </div>
        </div>
        {nextRow && (
          <div style={{ padding: '11px 20px', background: 'rgba(0,0,0,0.16)', display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9.5, lineHeight: 1.15, letterSpacing: '0.1em', opacity: 0.8, flexShrink: 0 }}>HANDS<br/>OFF&nbsp;TO</span>
            <Avatar initials={nextRow.runner.initials} color={t.ink} ink={sc} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 15.5, lineHeight: 1 }}>{nextRow.runner.name}</div>
              <div style={{ fontFamily: P_BODY, fontWeight: 600, fontSize: 11, opacity: 0.85, marginTop: 3 }}>Leg {nextRow.n} · {nextRow.dist} mi → {nextRow.town}</div>
            </div>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em', opacity: 0.7, flexShrink: 0 }}>ON DECK</span>
          </div>
        )}
        <a href={K.navUrl(cur.town)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(0,0,0,0.30)', cursor: 'pointer', textDecoration: 'none', color: t.ink }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>DRIVE TO {cur.town.toUpperCase()}</span>
          <span style={{ fontSize: 20 }}>→</span>
        </a>
      </div>

      {/* course */}
      <button onClick={onCourse} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: t.text,
        padding: '22px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: P_DISP, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.02em' }}>The Course</span>
        <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, color: t.accent, letterSpacing: '0.06em' }}>ALL 18 LEGS →</span>
      </button>
      <div style={{ padding: '0 8px 30px' }}>
        {TL.rows.map((r, i) => <CourseRow key={r.n} r={r} cur={cur} t={t} last={i === TL.rows.length - 1} />)}
      </div>
    </div>
  );
}

// ───────────────────────── Driver ─────────────────────────
function DriverTop({ t, right, rightColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 12px', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: t.accent }} />
        <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em' }}>TRAIL MIX</span>
      </div>
      <span style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: rightColor || t.mut }}>{right}</span>
    </div>
  );
}

function DriverStart({ t, onStart }) {
  const K = window.KT82, first = K.rows[0];
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: P_BODY, paddingTop: 50, display: 'flex', flexDirection: 'column' }}>
      <DriverTop t={t} right="RACE NOT STARTED" />
      <div style={{ padding: '20px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', color: t.accent }}>{K.raceName} · {K.raceSub.toUpperCase()}</div>
        <div style={{ fontFamily: P_DISP, fontSize: 60, lineHeight: 0.86, textTransform: 'uppercase', marginTop: 8 }}>Ready<br/>to roll</div>
        <div style={{ fontFamily: P_BODY, fontWeight: 600, fontSize: 13, color: t.mut, marginTop: 12 }}>
          {K.totalMiles} miles · {K.totalLegs} legs · 6 runners. Hold START when the gun goes off — it starts the clock for the whole team.</div>
        <div style={{ marginTop: 22, background: t.panel, border: `1px solid ${t.line}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>FIRST LEG · UP NOW</span>
            <span style={{ fontFamily: P_DISP, fontSize: 24, color: t.accent }}>01</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar initials={first.runner.initials} color={t.accent} ink={t.ink} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: P_DISP, fontSize: 30, lineHeight: 0.9, textTransform: 'uppercase' }}>{first.runner.name}</div>
              <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 12, color: t.mut, marginTop: 5 }}>→ {first.town} · {first.dist} mi · target {K.fmt.pace(first.runner.pace)}/mi</div>
            </div>
          </div>
          <a href={K.navUrl(first.town)} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: `1px solid ${t.line}`, background: t.panel2, textDecoration: 'none', color: t.accent }}>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 13, letterSpacing: '0.04em' }}>NAVIGATE TO {first.town.toUpperCase()}</span>
            <span style={{ fontSize: 17 }}>↗</span>
          </a>
        </div>
        <div style={{ flex: 1, minHeight: 18 }} />
        <HoldButton label="START" holdLabel="KEEP HOLDING…" holdMs={600} onComplete={onStart} color={t.accent} ink={t.ink} t={t} height={92} fontSize={40} />
        <div style={{ textAlign: 'center', fontFamily: P_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: t.faint, margin: '10px 0 18px' }}>HOLD TO START THE RACE CLOCK</div>
      </div>
    </div>
  );
}

function DriverTiming({ t, legIdx, legStartedAt, raceStartedAt, nowMs, onLap, onEnd, onCourse, onArrival }) {
  const K = window.KT82;
  const meta = K.legs[legIdx], runner = K.runners[legIdx % 6];
  const targetSec = K.targetSecFor(legIdx + 1);
  const elapsedSec = Math.max(0, (nowMs - legStartedAt) / 1000);
  const raceSec = Math.max(0, (nowMs - raceStartedAt) / 1000);
  const projFinishMs = Math.max(legStartedAt + targetSec * 1000, nowMs);
  const c = K.fmt.clock(new Date(projFinishMs));
  const overdue = elapsedSec > targetSec;
  const sc = overdue ? t.red : t.green;
  const distLeft = Math.max(0, Math.round(meta.dist * (1 - Math.min(elapsedSec / targetSec, 1)) * 10) / 10);
  const nextMeta = K.legs[legIdx + 1] || null, nextRunner = K.runners[(legIdx + 1) % 6];
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: P_BODY, paddingTop: 50, display: 'flex', flexDirection: 'column' }}>
      <DriverTop t={t} right={`RACE  ${K.fmt.dur(raceSec)}`} />
      <div style={{ padding: '16px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>NOW RUNNING · LEG {legIdx + 1}</span>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 10.5, letterSpacing: '0.08em', color: t.ink, background: sc, padding: '4px 9px', borderRadius: 20 }}>{overdue ? 'BEHIND PACE' : 'ON PACE'}</span>
        </div>
        <div style={{ fontFamily: P_DISP, fontSize: 50, lineHeight: 0.9, textTransform: 'uppercase', marginTop: 8 }}>{runner.name}</div>
        <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.06em', color: t.mut, marginTop: 8 }}>→ {meta.town.toUpperCase()} · {meta.dist} MI</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: t.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${t.line}` }}>
            <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: t.mut }}>LEG TIME</div>
            <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 38, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em' }}>{K.fmt.dur(elapsedSec)}</div>
          </div>
          <div style={{ flex: 1, background: t.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${sc}55` }}>
            <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: sc }}>ETA · {meta.town.toUpperCase()}</div>
            <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 38, lineHeight: 1, marginTop: 8, color: sc, letterSpacing: '-0.02em' }}>{c.full}<span style={{ fontSize: 16 }}>{c.ap.toLowerCase()}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: P_MONO, fontSize: 11, color: t.faint, marginTop: 8 }}>
          <span>{distLeft} mi to handoff</span>
          <span>target {K.fmt.pace(runner.pace)}/mi</span>
        </div>
        <button onClick={onArrival} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginTop: 14, background: sc, border: 'none', borderRadius: 16,
          padding: '13px 18px', cursor: 'pointer', color: t.ink, textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 14, letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap' }}>WHEN DO THEY ARRIVE?</span>
            <span style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 10, opacity: 0.85, letterSpacing: '0.06em', lineHeight: 1, whiteSpace: 'nowrap' }}>EST. RANGE · PACE ±30s/MI</span>
          </span>
          <span style={{ fontSize: 20, flexShrink: 0 }}>→</span>
        </button>
        {nextMeta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, background: t.panel2, borderRadius: 14, padding: '10px 14px' }}>
            <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 9.5, lineHeight: 1.15, letterSpacing: '0.1em', color: t.accent, flexShrink: 0 }}>ON<br/>DECK</span>
            <Avatar initials={nextRunner.initials} color={t.accent} ink={t.ink} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 14 }}>{nextRunner.name}</div>
              <div style={{ fontFamily: P_BODY, fontWeight: 600, fontSize: 11, color: t.mut, marginTop: 2 }}>Leg {legIdx + 2} · {nextMeta.dist} mi → {nextMeta.town}</div>
            </div>
          </div>
        )}
        <a href={K.navUrl(meta.town)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, border: `1.5px solid ${t.accent}`, borderRadius: 16, padding: '13px 18px', textDecoration: 'none', color: t.accent }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>NAVIGATE TO {meta.town.toUpperCase()}</span>
          <span style={{ fontSize: 18 }}>↗</span>
        </a>
        <button onClick={onCourse} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginTop: 10, background: t.panel2, border: `1px solid ${t.line}`, borderRadius: 16,
          padding: '12px 18px', cursor: 'pointer', color: t.text }}>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 13, letterSpacing: '0.04em' }}>VIEW ALL 18 LEGS</span>
          <span style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 12, color: t.mut }}>THE COURSE →</span>
        </button>
        <div style={{ flex: 1, minHeight: 14 }} />
        <HoldButton label="LAP" holdLabel="KEEP HOLDING…" holdMs={1500} onComplete={onLap} color={t.accent} ink={t.ink} t={t} height={84} fontSize={34} />
        <div style={{ textAlign: 'center', fontFamily: P_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: t.faint, margin: '8px 0 12px' }}>HOLD TO RECORD HANDOFF AT {meta.town.toUpperCase()}</div>
        <div style={{ paddingBottom: 14 }}>
          <HoldButton label="••• END RACE EARLY" holdLabel="KEEP HOLDING TO STOP…" holdMs={1500} onComplete={onEnd} color={t.panel2} ink={t.mut} t={t} height={46} fontSize={14} />
        </div>
      </div>
    </div>
  );
}

function DriverComplete({ t, splits, raceStartedAt }) {
  const K = window.KT82;
  const totalSec = splits.reduce((s, r) => s + r.sec, 0);
  const finish = K.fmt.clock(new Date(raceStartedAt + totalSec * 1000));
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: P_BODY, paddingTop: 50 }}>
      <DriverTop t={t} right="FINISHED ✓" rightColor={t.green} />
      <div style={{ padding: '22px 18px 6px' }}>
        <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', color: t.green }}>RACE COMPLETE</div>
        <div style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 56, lineHeight: 0.9, marginTop: 10, letterSpacing: '-0.03em' }}>{K.fmt.dur(totalSec)}</div>
        <div style={{ fontFamily: P_BODY, fontWeight: 700, fontSize: 12.5, color: t.mut, marginTop: 8 }}>{splits.length} of {K.totalLegs} legs · finished {finish.full} {finish.ap}</div>
      </div>
      <div style={{ padding: '18px 18px 8px' }}>
        <span style={{ fontFamily: P_DISP, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Splits</span>
      </div>
      <div style={{ padding: '0 18px 16px' }}>
        {splits.map((r, i) => (
          <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i === splits.length - 1 ? 'none' : `1px solid ${t.line2}` }}>
            <span style={{ fontFamily: P_DISP, fontSize: 20, width: 26, color: t.faint, textAlign: 'center' }}>{String(r.n).padStart(2, '0')}</span>
            <Avatar initials={r.runner.initials} color={t.panel2} ink={t.mut} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: P_BODY, fontWeight: 800, fontSize: 14 }}>{r.runner.name}</div>
              <div style={{ fontFamily: P_BODY, fontWeight: 600, fontSize: 11, color: t.faint, marginTop: 1 }}>{r.town} · {r.dist} mi</div>
            </div>
            <span style={{ fontFamily: P_MONO, fontWeight: 700, fontSize: 15 }}>{K.fmt.dur(r.sec)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverApp({ t, resetKey, variant = 'A' }) {
  const K = window.KT82;
  const [phase, setPhase] = useState('start');
  const [legIdx, setLegIdx] = useState(0);
  const [raceStartedAt, setRaceStartedAt] = useState(null);
  const [legStartedAt, setLegStartedAt] = useState(null);
  const [splits, setSplits] = useState([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showCourse, setShowCourse] = useState(false);
  const [showArrival, setShowArrival] = useState(false);

  useEffect(() => { setPhase('start'); setLegIdx(0); setRaceStartedAt(null); setLegStartedAt(null); setSplits([]); setShowCourse(false); setShowArrival(false); }, [resetKey]);
  useEffect(() => {
    if (phase !== 'timing') return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  function startRace() { const n = Date.now(); setRaceStartedAt(n); setLegStartedAt(n); setNowMs(n); setPhase('timing'); }
  function lap() {
    const n = Date.now();
    const meta = K.legs[legIdx], runner = K.runners[legIdx % 6];
    setSplits(s => [...s, { n: legIdx + 1, town: meta.town, dist: meta.dist, runner, sec: (n - legStartedAt) / 1000 }]);
    if (legIdx >= K.totalLegs - 1) setPhase('complete');
    else { setLegIdx(i => i + 1); setLegStartedAt(n); setNowMs(n); }
  }
  function endRace() { setPhase('complete'); }

  if (phase === 'start') return <DriverStart t={t} onStart={startRace} />;
  if (phase === 'complete') return <DriverComplete t={t} splits={splits} raceStartedAt={raceStartedAt} />;
  if (showCourse) return <window.CourseLegsScreen t={t} currentLeg={legIdx + 1}
    raceSec={Math.max(0, (nowMs - raceStartedAt) / 1000)} subtitle="TRAIL MIX"
    backLabel="← TIMING" onBack={() => setShowCourse(false)} />;
  if (showArrival) {
    const meta = K.legs[legIdx], runner = K.runners[legIdx % 6];
    return <window.LegProgress t={t} variant={variant} legStartedAtMs={legStartedAt} nowMs={nowMs}
      dist={meta.dist} paceSec={runner.pace} runner={runner} town={meta.town} legN={legIdx + 1}
      totalLegs={K.totalLegs} teamName="Trail Mix" backLabel="← TIMING" onBack={() => setShowArrival(false)} />;
  }
  return <DriverTiming t={t} legIdx={legIdx} legStartedAt={legStartedAt} raceStartedAt={raceStartedAt} nowMs={nowMs} onLap={lap} onEnd={endRace} onCourse={() => setShowCourse(true)} onArrival={() => setShowArrival(true)} />;
}

Object.assign(window, { TrackerGrid, TrackerDetail, DriverApp, HoldButton, tok });
