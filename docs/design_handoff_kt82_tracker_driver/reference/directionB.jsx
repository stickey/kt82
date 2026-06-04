/* Direction B — "Course / Bib"
   Bold athletic-poster aesthetic. Exports DetailB, GridB (props: {theme}). */

function tokB(theme) {
  return theme === 'light'
    ? { bg:'#f4f0e7', panel:'#ffffff', panel2:'#faf6ec', line:'rgba(0,0,0,0.09)', line2:'rgba(0,0,0,0.05)',
        text:'#1a160f', mut:'#6f6759', faint:'#b0a795', accent:'#e8480f',
        green:'#0e9b52', red:'#dd3a23', amber:'#c47d12', ink:'#ffffff' }
    : { bg:'#13110a', panel:'#1d1810', panel2:'#241d12', line:'rgba(255,240,220,0.10)', line2:'rgba(255,240,220,0.055)',
        text:'#fbf6ee', mut:'#a99e8c', faint:'#6a6053', accent:'#ff5a1f',
        green:'#37d27a', red:'#ff4d2e', amber:'#ffae3b', ink:'#13110a' };
}
const B_DISP = "'Anton', sans-serif";
const B_BODY = "'Hanken Grotesk', sans-serif";
const B_MONO = "'JetBrains Mono', monospace";

function statusColorB(s, t) {
  return s === 'overdue' ? t.red : s === 'ahead' ? t.green : t.green;
}
function statusTextB(s) {
  return s === 'overdue' ? 'BEHIND PACE' : s === 'ahead' ? 'AHEAD' : 'ON PACE';
}

function Avatar({ initials, color, ink, size = 34, dim }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: B_BODY, fontWeight: 800, fontSize: size * 0.36, letterSpacing: '0.02em',
      opacity: dim ? 0.55 : 1 }}>{initials}</div>
  );
}

function NavPin({ town, color, bg, ring }) {
  return (
    <a href={window.KT82.navUrl(town)} target="_blank" rel="noopener noreferrer"
      title={`Directions to ${town}`}
      onClick={(e) => e.stopPropagation()}
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

function BCourseRow({ r, t, last }) {
  const K = window.KT82, c = K.fmt.clock(r.arrival);
  const isNow = r.status === 'now', isDone = r.status === 'done', isNext = r.status === 'next';
  const isOnDeck = r.n === K.current.n + 1;
  const sc = isNow ? statusColorB(r.delta > 0 ? 'overdue' : 'on-pace', t) : t.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px',
      background: isNow ? (r.delta > 0 ? `${t.red}1f` : `${t.green}1f`) : 'transparent',
      borderRadius: isNow ? 14 : 0,
      borderBottom: last || isNow ? 'none' : `1px solid ${t.line2}` }}>
      <div style={{ fontFamily: B_DISP, fontSize: 26, lineHeight: 0.8, width: 30, textAlign: 'center',
        color: isNow ? sc : isNext ? t.faint : t.mut }}>{String(r.n).padStart(2,'0')}</div>
      <Avatar initials={r.runner.initials} size={36}
        color={isNow ? sc : isDone ? t.panel2 : t.panel2}
        ink={isNow ? t.ink : t.mut} dim={isNext} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em',
            color: isNext ? t.mut : t.text }}>{r.runner.name}</span>
          {isDone && <span style={{ color: t.green, fontSize: 13, fontWeight: 800 }}>✓</span>}
          {isNow && <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.1em',
            color: t.ink, background: sc, padding: '2px 6px', borderRadius: 20 }}>LIVE</span>}
          {isOnDeck && <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.1em',
            color: t.accent, border: `1px solid ${t.accent}`, padding: '1px 6px', borderRadius: 20 }}>ON DECK</span>}
        </div>
        <div style={{ fontFamily: B_BODY, fontSize: 12, color: t.faint, marginTop: 1 }}>
          {r.town} · {r.dist} mi</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 15,
          color: isNow ? sc : isNext ? t.mut : t.text }}>
          {isNext ? '~' : ''}{c.full}</div>
        <div style={{ fontFamily: B_MONO, fontSize: 9.5, color: t.faint, marginTop: 1, letterSpacing: '0.05em' }}>
          {c.ap}{isDone && r.delta != null ? ` · ${r.delta >= 0 ? '+' : ''}${r.delta}m` : ''}</div>
      </div>
      <NavPin town={r.town} color={isNow ? sc : t.mut}
        bg={t.panel2} ring={isNow ? sc : t.line} />
    </div>
  );
}

function DetailB({ theme = 'dark' }) {
  const t = tokB(theme), K = window.KT82, cur = K.current;
  const c = K.fmt.clock(cur.arrival);
  const sc = statusColorB(cur.delta > 0 ? 'overdue' : 'on-pace', t);
  const nextRow = window.KT82.rows[cur.n] || null; // the runner Priya hands off to
  const pct = Math.round((K.milesDone / K.totalMiles) * 100);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: B_BODY, paddingTop: 52 }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 10px' }}>
        <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', color: t.mut }}>← ALL TEAMS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="a-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
          <span style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: t.mut }}>LIVE</span>
        </div>
      </div>

      {/* team header */}
      <div style={{ padding: '4px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', color: t.accent }}>{K.raceName} · {K.raceSub.toUpperCase()}</div>
          <div style={{ fontFamily: B_DISP, fontSize: 52, lineHeight: 0.84, letterSpacing: '0.01em', marginTop: 8,
            textTransform: 'uppercase' }}>Trail<br/>Mix</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'center', background: t.accent, color: t.ink, borderRadius: 14,
          padding: '8px 14px 10px', minWidth: 58 }}>
          <div style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.12em', opacity: 0.85 }}>LEG</div>
          <div style={{ fontFamily: B_DISP, fontSize: 38, lineHeight: 0.8, marginTop: 2 }}>{cur.n}</div>
          <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 10, opacity: 0.85, marginTop: 2 }}>of {K.totalLegs}</div>
        </div>
      </div>

      {/* race progress + total race time */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9 }}>
          <div>
            <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 26, lineHeight: 0.9, color: t.text }}>{K.fmt.dur(K.raceElapsedSec)}</div>
            <div style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: t.mut, marginTop: 5 }}>TOTAL RACE TIME</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 16, color: t.text }}>{K.milesToGo}<span style={{ fontSize: 11, color: t.mut }}> mi to go</span></div>
            <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', color: t.faint, marginTop: 6 }}>{K.milesDone} OF {K.totalMiles} MI DONE</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 20, background: t.line, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: t.accent, borderRadius: 20 }} />
        </div>
      </div>

      {/* HERO — next handoff */}
      <div style={{ margin: '0 18px', background: sc, color: t.ink, borderRadius: 22, overflow: 'hidden',
        boxShadow: theme === 'dark' ? `0 14px 40px ${sc}40` : `0 14px 34px ${sc}33` }}>
        <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', opacity: 0.9 }}>NOW RUNNING · LEG {cur.n}</span>
          <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 10.5, letterSpacing: '0.08em',
            background: 'rgba(0,0,0,0.18)', padding: '4px 9px', borderRadius: 20 }}>
            {cur.delta > 0 ? `${cur.delta} MIN BEHIND` : statusTextB('on-pace')}</span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontFamily: B_DISP, fontSize: 52, lineHeight: 0.88, textTransform: 'uppercase', letterSpacing: '0.005em' }}>{cur.runner.name}</div>
          <div style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.07em', opacity: 0.9, marginTop: 9 }}>→ HEADING TO {cur.town.toUpperCase()}</div>
        </div>
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 34, lineHeight: 0.9 }}>{c.full}<span style={{ fontSize: 16 }}> {c.ap}</span></div>
            <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 11, opacity: 0.85, marginTop: 5, letterSpacing: '0.06em' }}>EST. ARRIVAL</div>
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
            <div>
              <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 22, lineHeight: 0.95 }}>{K.fmt.dur(cur.elapsedSec)}</div>
              <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 10.5, opacity: 0.85, marginTop: 6, letterSpacing: '0.06em' }}>LEG TIME</div>
            </div>
            <div>
              <div style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 22, lineHeight: 0.95 }}>{cur.distLeft}<span style={{ fontSize: 12 }}> mi</span></div>
              <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 10.5, opacity: 0.85, marginTop: 6, letterSpacing: '0.06em' }}>TO GO</div>
            </div>
          </div>
        </div>
        {/* relay handoff — who Priya passes the baton to */}
        {nextRow && (
          <div style={{ padding: '11px 20px', background: 'rgba(0,0,0,0.16)', display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9.5, lineHeight: 1.15, letterSpacing: '0.1em',
              opacity: 0.8, flexShrink: 0 }}>HANDS<br/>OFF&nbsp;TO</span>
            <Avatar initials={nextRow.runner.initials} color={t.ink} ink={sc} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 15.5, lineHeight: 1 }}>{nextRow.runner.name}</div>
              <div style={{ fontFamily: B_BODY, fontWeight: 600, fontSize: 11, opacity: 0.85, marginTop: 3 }}>Leg {nextRow.n} · {nextRow.dist} mi → {nextRow.town}</div>
            </div>
            <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em', opacity: 0.7, flexShrink: 0 }}>ON DECK</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'rgba(0,0,0,0.30)', cursor: 'pointer' }}>
          <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>DRIVE TO {cur.town.toUpperCase()}</span>
          <span style={{ fontSize: 20 }}>→</span>
        </div>
      </div>

      {/* course list */}
      <div style={{ padding: '22px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: B_DISP, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.02em' }}>The Course</span>
        <span style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 11, color: t.mut, letterSpacing: '0.06em' }}>18 HANDOFFS</span>
      </div>
      <div style={{ padding: '0 8px 30px' }}>
        {K.rows.map((r, i) => <BCourseRow key={r.n} r={r} t={t} last={i === K.rows.length - 1} />)}
      </div>
    </div>
  );
}

function GridB({ theme = 'dark' }) {
  const t = tokB(theme), K = window.KT82;
  const sorted = [...K.teams].sort((a, b) => b.done - a.done);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: B_BODY, paddingTop: 52 }}>
      <div style={{ padding: '10px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: B_DISP, fontSize: 50, lineHeight: 0.84, textTransform: 'uppercase' }}>{K.raceName}</div>
          <div style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 12, color: t.accent, marginTop: 6, letterSpacing: '0.08em' }}>{K.raceSub.toUpperCase()} · {K.raceDate.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
          <div className="a-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
          <span style={{ fontFamily: B_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: t.mut }}>LIVE</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px 6px' }}>
        <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>6 TEAMS ON COURSE</span>
      </div>

      <div style={{ padding: '4px 18px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((tm, idx) => {
          const c = K.fmt.clock(tm.eta);
          const sc = statusColorB(tm.status, t);
          const lead = idx === 0;
          return (
            <div key={tm.id} style={{ background: t.panel, borderRadius: 18, overflow: 'hidden',
              border: `1px solid ${lead ? t.accent : t.line}`, display: 'flex' }}>
              <div style={{ width: 6, background: sc, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    {lead && <span style={{ fontFamily: B_DISP, fontSize: 18, color: t.accent }}>1</span>}
                    <span style={{ fontFamily: B_DISP, fontSize: 28, lineHeight: 0.85, textTransform: 'uppercase',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.name}</span>
                  </div>
                  <span style={{ fontFamily: B_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.08em',
                    color: t.ink, background: sc, padding: '3px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {statusTextB(tm.status)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontFamily: B_BODY, fontSize: 12.5, color: t.mut }}>
                    Leg {tm.leg} · {tm.runner.split(' ')[0]} <span style={{ color: t.faint }}>→</span> {tm.next}</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: B_MONO, fontWeight: 700, fontSize: 16, color: sc }}>{c.full}</span>
                    <span style={{ fontFamily: B_MONO, fontSize: 10, color: t.mut }}> {c.ap}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 20, background: t.line, overflow: 'hidden' }}>
                    <div style={{ width: `${(tm.done / K.totalLegs) * 100}%`, height: '100%', background: sc, borderRadius: 20 }} />
                  </div>
                  <span style={{ fontFamily: B_MONO, fontSize: 11, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{tm.toGo} mi</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { DetailB, GridB, tokB, Avatar, NavPin, statusColorB, statusTextB });
