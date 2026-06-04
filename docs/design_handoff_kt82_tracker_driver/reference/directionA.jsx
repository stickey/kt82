/* Direction A — "Race Instrument"
   Precision-chronograph aesthetic. Exports DetailA, GridA (props: {theme}). */

function tokA(theme) {
  return theme === 'light'
    ? { bg:'#e7e9eb', panel:'#ffffff', panel2:'#f3f4f5', line:'rgba(0,0,0,0.10)', line2:'rgba(0,0,0,0.055)',
        text:'#13171a', mut:'#5b636b', faint:'#a7adb3', sig:'#4f7000', warn:'#9a5b00',
        sigInk:'#ffffff', warnInk:'#ffffff', sigSoft:'rgba(79,112,0,0.12)', warnSoft:'rgba(154,91,0,0.12)' }
    : { bg:'#0a0b0d', panel:'#121417', panel2:'#16191d', line:'rgba(255,255,255,0.09)', line2:'rgba(255,255,255,0.05)',
        text:'#f3f5f6', mut:'#878d95', faint:'#474d54', sig:'#cdf03a', warn:'#ffb020',
        sigInk:'#0a0b0d', warnInk:'#0a0b0d', sigSoft:'rgba(205,240,58,0.12)', warnSoft:'rgba(255,176,32,0.12)' };
}
const A_COND = "'Saira Condensed', sans-serif";
const A_BODY = "'Saira', sans-serif";
const A_MONO = "'Spline Sans Mono', monospace";

function ALabel({ children, c, style }) {
  return <div style={{ fontFamily: A_MONO, fontSize: 10, fontWeight: 500, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: c, ...style }}>{children}</div>;
}

function AChip({ children, kind, t }) {
  const isWarn = kind === 'warn', isSig = kind === 'sig';
  const bg = isWarn ? t.warn : isSig ? t.sig : 'transparent';
  const fg = isWarn ? t.warnInk : isSig ? t.sigInk : t.mut;
  return <span style={{ fontFamily: A_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
    textTransform: 'uppercase', background: bg, color: fg, padding: '3px 7px', borderRadius: 3,
    border: kind === 'mut' ? `1px solid ${t.line}` : 'none', whiteSpace: 'nowrap' }}>{children}</span>;
}

function ProgressTicks({ done, total, t }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: 4, height: 12, borderRadius: 1,
          background: i < done ? t.sig : i === done ? t.warn : t.line,
          opacity: i <= done ? 1 : 1 }} />
      ))}
    </div>
  );
}

function ARailRow({ r, t, last }) {
  const K = window.KT82, c = K.fmt.clock(r.arrival);
  const isNow = r.status === 'now', isDone = r.status === 'done', isNext = r.status === 'next';
  const accent = r.delta > 0 && isNow ? t.warn : t.sig;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, opacity: isDone ? 0.5 : 1 }}>
      {/* leg number */}
      <div style={{ width: 20, paddingTop: 14, textAlign: 'right', fontFamily: A_MONO, fontSize: 11,
        color: isNow ? accent : t.faint, fontWeight: 600 }}>{String(r.n).padStart(2,'0')}</div>
      {/* node + line */}
      <div style={{ width: 16, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5,
          transform: 'translateX(-50%)', background: last ? 'transparent' : t.line }} />
        <div style={{ position: 'absolute', left: '50%', top: 15, transform: 'translate(-50%,0)' }}>
          {isNow ? (
            <div style={{ position: 'relative', width: 12, height: 12 }}>
              <div className="a-pulse" style={{ position: 'absolute', inset: -5, borderRadius: '50%', background: accent, opacity: 0.25 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: accent,
                boxShadow: `0 0 10px ${accent}` }} />
            </div>
          ) : isDone ? (
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.faint }} />
          ) : (
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.bg, border: `1.5px solid ${t.faint}` }} />
          )}
        </div>
      </div>
      {/* content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', padding: '9px 0 11px', borderBottom: last ? 'none' : `1px solid ${t.line2}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: A_COND, fontWeight: 700, fontSize: 18, lineHeight: 1,
              color: isNext ? t.mut : t.text, letterSpacing: '0.01em' }}>{r.town}</span>
            {isNow && <AChip kind={r.delta > 0 ? 'warn' : 'sig'} t={t}>{r.delta > 0 ? `+${r.delta} MIN` : 'ON PACE'}</AChip>}
          </div>
          <div style={{ fontFamily: A_BODY, fontSize: 11.5, color: t.faint, marginTop: 3 }}>
            {r.runner.name.split(' ')[0]} {r.runner.name.split(' ')[1]?.[0] ? r.runner.name.split(' ')[1][0]+'.' : ''} · {r.dist} mi
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
          <div style={{ fontFamily: A_MONO, fontSize: 15, fontWeight: 600,
            color: isNow ? accent : isNext ? t.mut : t.text }}>
            <span style={{ color: isNext ? t.faint : 'inherit' }}>{isNext ? '~' : ''}</span>{c.full}
          </div>
          <ALabel c={t.faint} style={{ fontSize: 8.5, marginTop: 2 }}>{c.ap}{isDone ? ' · IN' : ''}</ALabel>
        </div>
      </div>
    </div>
  );
}

function DetailA({ theme = 'dark' }) {
  const t = tokA(theme), K = window.KT82, cur = K.current;
  const c = K.fmt.clock(cur.arrival);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: A_BODY,
      paddingTop: 54, WebkitFontSmoothing: 'antialiased' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 18px 14px' }}>
        <ALabel c={t.mut}>‹&nbsp;&nbsp;ALL TEAMS</ALabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="a-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: t.sig }} />
          <ALabel c={t.mut}>LIVE · 0:31</ALabel>
        </div>
      </div>

      {/* team header */}
      <div style={{ padding: '0 18px 16px' }}>
        <ALabel c={t.faint}>{K.raceName} · {K.raceSub.toUpperCase()}</ALabel>
        <div style={{ fontFamily: A_COND, fontWeight: 800, fontSize: 46, lineHeight: 0.92,
          letterSpacing: '0.005em', marginTop: 6 }}>Trail Mix</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <ALabel c={t.mut} style={{ letterSpacing: '0.14em' }}>LEG {cur.n} / {K.totalLegs}</ALabel>
          <ProgressTicks done={K.doneCount} total={K.totalLegs} t={t} />
        </div>
      </div>

      {/* primary instrument panel */}
      <div style={{ margin: '0 18px', background: t.panel, border: `1px solid ${t.line}`, borderRadius: 8,
        overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <ALabel c={t.mut}>NEXT HANDOFF</ALabel>
          <AChip kind={cur.delta > 0 ? 'warn' : 'sig'} t={t}>{cur.delta > 0 ? `▲ ${cur.delta} MIN BEHIND` : 'ON PACE'}</AChip>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontFamily: A_COND, fontWeight: 800, fontSize: 40, lineHeight: 1, marginTop: 2 }}>{cur.town}</div>
        </div>
        {/* arrival readout */}
        <div style={{ padding: '12px 16px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: A_MONO, fontWeight: 600, fontSize: 48, lineHeight: 0.9,
                color: cur.delta > 0 ? t.warn : t.sig, letterSpacing: '-0.02em' }}>{c.full}</span>
              <span style={{ fontFamily: A_MONO, fontWeight: 600, fontSize: 18, color: cur.delta > 0 ? t.warn : t.sig }}>{c.ap}</span>
            </div>
            <ALabel c={t.mut} style={{ marginTop: 6 }}>PROJECTED ARRIVAL</ALabel>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: A_MONO, fontSize: 20, fontWeight: 600 }}>{cur.distLeft}<span style={{ fontSize: 12, color: t.mut }}> mi</span></div>
            <ALabel c={t.mut} style={{ marginTop: 4 }}>TO GO</ALabel>
          </div>
        </div>
        {/* leg progress bar */}
        <div style={{ height: 4, background: t.line2, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(cur.distDone / cur.dist) * 100}%`, background: cur.delta > 0 ? t.warn : t.sig }} />
        </div>
        {/* stat strip */}
        <div style={{ display: 'flex', borderTop: `1px solid ${t.line}` }}>
          {[['RUNNER', cur.runner.name.split(' ')[0]], ['PACE', K.fmt.pace(cur.runner.pace) + '/mi'], ['LEG DIST', cur.dist + ' mi']].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '11px 14px', borderLeft: i ? `1px solid ${t.line}` : 'none' }}>
              <div style={{ fontFamily: A_COND, fontWeight: 700, fontSize: 17 }}>{s[1]}</div>
              <ALabel c={t.faint} style={{ marginTop: 3 }}>{s[0]}</ALabel>
            </div>
          ))}
        </div>
        {/* drive action */}
        <a style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 16px', borderTop: `1px solid ${t.line}`, background: t.panel2,
          textDecoration: 'none', cursor: 'pointer' }}>
          <div>
            <ALabel c={cur.delta > 0 ? t.warn : t.sig}>▸ DRIVE TO NEXT HANDOFF</ALabel>
            <div style={{ fontFamily: A_BODY, fontSize: 12.5, color: t.mut, marginTop: 3 }}>{cur.town} Trailhead · 6.2 mi by road</div>
          </div>
          <div style={{ fontFamily: A_MONO, fontSize: 20, color: t.text }}>↗</div>
        </a>
      </div>

      {/* course rail */}
      <div style={{ padding: '22px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ALabel c={t.mut}>ALL HANDOFFS</ALabel>
        <ALabel c={t.faint}>{K.milesToGo} MI TO FINISH</ALabel>
      </div>
      <div style={{ padding: '0 18px 30px' }}>
        {K.rows.map((r, i) => <ARailRow key={r.n} r={r} t={t} last={i === K.rows.length - 1} />)}
      </div>
    </div>
  );
}

function GridA({ theme = 'dark' }) {
  const t = tokA(theme), K = window.KT82;
  const sorted = [...K.teams].sort((a, b) => b.done - a.done);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: A_BODY, paddingTop: 54 }}>
      <div style={{ padding: '8px 18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: A_COND, fontWeight: 800, fontSize: 40, lineHeight: 0.9 }}>{K.raceName}</div>
            <ALabel c={t.mut} style={{ marginTop: 6 }}>{K.raceSub.toUpperCase()} · {K.raceDate.toUpperCase()}</ALabel>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6 }}>
            <div className="a-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: t.sig }} />
            <ALabel c={t.mut}>LIVE</ALabel>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 16, border: `1px solid ${t.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[['TEAMS', K.teams.length], ['MILES', K.totalMiles], ['LEGS', K.totalLegs]].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '10px 14px', borderLeft: i ? `1px solid ${t.line}` : 'none', background: t.panel }}>
              <div style={{ fontFamily: A_MONO, fontWeight: 600, fontSize: 18 }}>{s[1]}</div>
              <ALabel c={t.faint} style={{ marginTop: 3 }}>{s[0]}</ALabel>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 18px 8px' }}>
        <ALabel c={t.faint}>STANDINGS · BY PROGRESS</ALabel>
      </div>
      <div style={{ padding: '0 18px 30px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((tm, idx) => {
          const c = K.fmt.clock(tm.eta);
          const acc = tm.status === 'overdue' ? t.warn : t.sig;
          return (
            <div key={tm.id} style={{ background: t.panel, border: `1px solid ${tm.focus ? acc : t.line}`,
              borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 10px', gap: 12 }}>
                <div style={{ fontFamily: A_MONO, fontSize: 12, color: t.faint, width: 16 }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: A_COND, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{tm.name}</div>
                  <div style={{ fontFamily: A_BODY, fontSize: 11.5, color: t.mut, marginTop: 4 }}>
                    Leg {tm.leg} · {tm.runner.split(' ')[0]} → {tm.next}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: A_MONO, fontSize: 17, fontWeight: 600, color: acc }}>{c.full}<span style={{ fontSize: 10 }}> {c.ap}</span></div>
                  <ALabel c={t.faint} style={{ marginTop: 3 }}>{tm.toGo} MI TO GO</ALabel>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, padding: '0 14px 12px' }}>
                {Array.from({ length: K.totalLegs }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 1,
                    background: i < tm.done ? t.sig : i === tm.done ? acc : t.line }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { DetailA, GridA, tokA });
