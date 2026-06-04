/* KT82 — "When do they arrive?" leg-progress screen.
   Shows a runner's estimated progress on the CURRENT (live) leg, swept across
   target pace ±30s/mi in 15s steps (5 scenarios). Two layout directions:
     variant "A" — one hero progress bar with 5 fanned tick markers + a clean
                   numeric table below.
     variant "B" — five stacked "pace lanes", each its own mini progress bar +
                   arrival / countdown / delta inline.
   Time-based model: distance covered ≈ elapsed-since-handoff ÷ assumed pace.
   Needs kt82-data.js (window.KT82.fmt.clock). Exports window.LegProgress. */

const LP_DISP = "'Anton', sans-serif";
const LP_BODY = "'Hanken Grotesk', sans-serif";
const LP_MONO = "'JetBrains Mono', monospace";
const LP_OFFSETS = [-30, -15, 0, 15, 30]; // sec/mile, fastest → slowest

function lpDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              : `${m}:${String(s).padStart(2, '0')}`;
}
function lpPace(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function lpSigned(sec) {
  const sign = sec > 0 ? '+' : sec < 0 ? '−' : '';
  return sign + lpPace(Math.abs(sec));
}
function lpClock(ms) {
  const c = window.KT82.fmt.clock(new Date(ms));
  return { full: c.full, ap: c.ap };
}
function lpOffLabel(off) { return off === 0 ? 'TARGET' : off < 0 ? `${off}s` : `+${off}s`; }
function lpOffTag(off) { return off === -30 ? 'FASTEST' : off === 30 ? 'SLOWEST' : off === 0 ? 'TARGET' : ''; }

function lpEstimates(legStartedAtMs, nowMs, dist, paceSec) {
  const elapsed = Math.max(0, (nowMs - legStartedAtMs) / 1000);
  return LP_OFFSETS.map((off) => {
    const p = paceSec + off;
    const total = dist * p;
    const frac = dist > 0 ? Math.max(0, Math.min(1, (elapsed / p) / dist)) : 0;
    const finishMs = legStartedAtMs + total * 1000;
    return {
      off, p, total, frac, finishMs,
      remain: Math.max(0, (finishMs - nowMs) / 1000),
      deltaSec: dist * off, // total − dist*paceSec
      arrived: nowMs >= finishMs,
    };
  });
}

// ───────────────────────── shared chrome ─────────────────────────
function LPHeader({ t, onBack, backLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 8px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.mut,
        fontFamily: LP_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap' }}>{backLabel}</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="a-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
        <span style={{ fontFamily: LP_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: t.mut }}>LIVE</span>
      </div>
    </div>
  );
}

function LPTitle({ t, runner, town, legN, totalLegs, dist, paceSec, teamName }) {
  return (
    <div style={{ padding: '4px 18px 0' }}>
      <div style={{ fontFamily: LP_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', color: t.accent }}>
        LEG {legN} OF {totalLegs}{teamName ? ` · ${teamName.toUpperCase()}` : ''}</div>
      <div style={{ fontFamily: LP_DISP, fontSize: 44, lineHeight: 0.92, textTransform: 'uppercase', marginTop: 7 }}>{runner.name}</div>
      <div style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', color: t.mut, marginTop: 9 }}>
        → {town.toUpperCase()} · {dist.toFixed(1)} MI · TARGET <span style={{ color: t.text, fontFamily: LP_MONO, fontWeight: 700 }}>{lpPace(paceSec)}</span>/MI</div>
    </div>
  );
}

// ───────────────────────── Direction A: hero bar + table ─────────────────────────
function LPHeroBar({ t, ests, dist }) {
  const target = ests[2];
  const minFrac = ests[ests.length - 1].frac; // slowest pace → least progress
  const maxFrac = ests[0].frac;               // fastest pace → most progress
  const pct = Math.round(target.frac * 100);
  const milesIn = (target.frac * dist);

  // The true ±30s spread is only a few % wide; widen the drawn span to a legible
  // minimum (centered on the best estimate) so the range reads on the bar.
  const MIN_SPAN = 0.10;
  const half = Math.max((maxFrac - minFrac) / 2, MIN_SPAN / 2);
  const visMin = Math.max(0, target.frac - half);
  const visMax = Math.min(1, target.frac + half);
  const L = visMin * 100, R = visMax * 100, W = R - L;

  return (
    <div style={{ padding: '18px 18px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', color: t.mut, whiteSpace: 'nowrap' }}>ESTIMATED POSITION · NOW</span>
        <span style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 11, color: t.accent, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>≈{milesIn.toFixed(1)} OF {dist.toFixed(1)} MI</span>
      </div>

      {/* progress bar with a range "I-beam" marker for the span of likely position */}
      <div style={{ position: 'relative', height: 30 }}>
        {/* track */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 12, transform: 'translateY(-50%)', borderRadius: 20, background: t.line }} />
        {/* solid progress up to the earliest likely position */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: `${L}%`, height: 12, transform: 'translateY(-50%)', borderRadius: '20px 0 0 20px', background: t.accent }} />
        {/* the range span (connecting horizontal bar) */}
        <div style={{ position: 'absolute', top: '50%', left: `${L}%`, width: `${W}%`, height: 12, transform: 'translateY(-50%)', background: `${t.accent}66` }} />
        {/* two narrow vertical end-caps */}
        <div style={{ position: 'absolute', top: '50%', left: `${L}%`, transform: 'translate(-50%,-50%)', width: 3.5, height: 26, borderRadius: 2, background: t.accent }} />
        <div style={{ position: 'absolute', top: '50%', left: `${R}%`, transform: 'translate(-50%,-50%)', width: 3.5, height: 26, borderRadius: 2, background: t.accent }} />
        {/* best-estimate tick inside the span */}
        <div style={{ position: 'absolute', top: '50%', left: `${target.frac * 100}%`, transform: 'translate(-50%,-50%)', width: 3, height: 18, borderRadius: 2, background: t.panel }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 11 }}>
        <span style={{ fontFamily: LP_MONO, fontSize: 10, color: t.faint }}>0 mi · handoff</span>
        <span style={{ fontFamily: LP_BODY, fontWeight: 700, fontSize: 10, color: t.mut, whiteSpace: 'nowrap' }}>likely range · ≈{pct}% in</span>
        <span style={{ fontFamily: LP_MONO, fontSize: 10, color: t.faint }}>{dist.toFixed(1)} mi · finish</span>
      </div>
    </div>
  );
}

function LPTable({ t, ests }) {
  const cols = [
    { k: 'pace', label: 'PACE', flex: '0 0 52px', align: 'left' },
    { k: 'arr', label: 'ARRIVES', flex: '1 1 0', align: 'right' },
    { k: 'in', label: 'IN', flex: '0 0 58px', align: 'right' },
    { k: 'delta', label: 'Δ', flex: '0 0 50px', align: 'right' },
    { k: 'leg', label: 'LEG TIME', flex: '0 0 56px', align: 'right' },
  ];
  return (
    <div style={{ padding: '14px 18px 26px' }}>
      <div style={{ fontFamily: LP_DISP, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8 }}>Arrival by pace</div>
      <div style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 16, overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${t.line}` }}>
          {cols.map((c) => (
            <span key={c.k} style={{ flex: c.flex, textAlign: c.align, fontFamily: LP_BODY, fontWeight: 800,
              fontSize: 8.5, letterSpacing: '0.08em', color: t.faint }}>{c.label}</span>
          ))}
        </div>
        {ests.map((e, i) => {
          const isT = e.off === 0;
          const c = lpClock(e.finishMs);
          const dc = e.deltaSec > 0 ? t.red : e.deltaSec < 0 ? t.green : t.mut;
          return (
            <div key={e.off} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 14px',
              background: isT ? `${t.accent}14` : 'transparent', borderBottom: i === ests.length - 1 ? 'none' : `1px solid ${t.line2}` }}>
              <span style={{ flex: cols[0].flex, textAlign: 'left' }}>
                <span style={{ fontFamily: LP_MONO, fontWeight: 700, fontSize: 14, color: isT ? t.accent : t.text }}>{lpPace(e.p)}</span>
                {lpOffTag(e.off) && <span style={{ display: 'block', fontFamily: LP_BODY, fontWeight: 800, fontSize: 7, letterSpacing: '0.06em', color: t.faint, marginTop: 2 }}>{lpOffTag(e.off)}</span>}
              </span>
              <span style={{ flex: cols[1].flex, textAlign: 'right', fontFamily: LP_MONO, fontWeight: 700, fontSize: 14.5, color: isT ? t.accent : t.text, whiteSpace: 'nowrap' }}>
                {c.full}<span style={{ fontSize: 9, color: t.mut }}> {c.ap}</span></span>
              <span style={{ flex: cols[2].flex, textAlign: 'right', fontFamily: LP_MONO, fontSize: 12.5, color: t.mut, whiteSpace: 'nowrap' }}>{lpDur(e.remain)}</span>
              <span style={{ flex: cols[3].flex, textAlign: 'right', fontFamily: LP_MONO, fontWeight: 700, fontSize: 12, color: dc, whiteSpace: 'nowrap' }}>{e.deltaSec === 0 ? '—' : lpSigned(e.deltaSec)}</span>
              <span style={{ flex: cols[4].flex, textAlign: 'right', fontFamily: LP_MONO, fontSize: 12.5, color: t.mut, whiteSpace: 'nowrap' }}>{lpPace(e.total)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: LP_BODY, fontWeight: 600, fontSize: 10.5, color: t.faint, marginTop: 10, lineHeight: 1.4 }}>
        Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time.</div>
    </div>
  );
}

// ───────────────────────── Direction B: pace lanes ─────────────────────────
function LPLanes({ t, ests, dist }) {
  const target = ests[2];
  const tc = lpClock(target.finishMs);
  return (
    <div style={{ padding: '8px 18px 26px' }}>
      {/* best-estimate hero */}
      <div style={{ background: t.accent, color: t.ink, borderRadius: 18, padding: '14px 18px 16px', marginTop: 10,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.12em', opacity: 0.9 }}>BEST ESTIMATE · ON TARGET PACE</div>
          <div style={{ fontFamily: LP_MONO, fontWeight: 700, fontSize: 36, lineHeight: 0.95, marginTop: 8 }}>{tc.full}<span style={{ fontSize: 17 }}> {tc.ap}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: LP_MONO, fontWeight: 700, fontSize: 22, lineHeight: 0.95 }}>{lpDur(target.remain)}</div>
          <div style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.08em', opacity: 0.9, marginTop: 5 }}>TILL HANDOFF</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '20px 0 4px' }}>
        <span style={{ fontFamily: LP_DISP, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em' }}>If pace holds at…</span>
        <span style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.08em', color: t.faint }}>±30s/MI</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {ests.map((e) => {
          const isT = e.off === 0;
          const c = lpClock(e.finishMs);
          const dc = e.deltaSec > 0 ? t.red : e.deltaSec < 0 ? t.green : t.mut;
          const tag = lpOffTag(e.off);
          return (
            <div key={e.off} style={{ background: isT ? `${t.accent}14` : t.panel,
              border: `1px solid ${isT ? t.accent : t.line}`, borderRadius: 14, padding: '11px 14px' }}>
              {/* line 1 */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
                  <span style={{ fontFamily: LP_MONO, fontWeight: 700, fontSize: 18, color: isT ? t.accent : t.text }}>{lpPace(e.p)}</span>
                  <span style={{ fontFamily: LP_BODY, fontWeight: 700, fontSize: 9.5, color: t.faint }}>/mi</span>
                  {tag && <span style={{ fontFamily: LP_BODY, fontWeight: 800, fontSize: 7.5, letterSpacing: '0.07em',
                    color: isT ? t.ink : t.mut, background: isT ? t.accent : t.panel2, padding: '2px 6px', borderRadius: 20 }}>{tag}</span>}
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: LP_MONO, fontWeight: 700, fontSize: 17, color: isT ? t.accent : t.text }}>{c.full}</span>
                  <span style={{ fontFamily: LP_MONO, fontSize: 10, color: t.mut }}> {c.ap}</span>
                </div>
              </div>
              {/* line 2: mini bar */}
              <div style={{ position: 'relative', height: 7, borderRadius: 20, background: t.line, margin: '10px 0 8px' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${e.frac * 100}%`, borderRadius: 20, background: isT ? t.accent : t.mut }} />
                <div style={{ position: 'absolute', top: '50%', left: `${e.frac * 100}%`, transform: 'translate(-50%,-50%)',
                  width: 11, height: 11, borderRadius: '50%', background: isT ? t.accent : t.panel, border: `2px solid ${isT ? t.ink : t.mut}` }} />
              </div>
              {/* line 3: metrics */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: LP_MONO, fontSize: 10.5, whiteSpace: 'nowrap' }}>
                <span style={{ color: t.faint }}>≈{Math.round(e.frac * 100)}% there · leg {lpPace(e.total)}</span>
                <span>
                  <span style={{ color: t.mut }}>in {lpDur(e.remain)}</span>
                  <span style={{ color: dc, fontWeight: 700, marginLeft: 10 }}>{e.deltaSec === 0 ? 'on tgt' : lpSigned(e.deltaSec)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── screen ─────────────────────────
function LegProgress({ t, variant = 'A', legStartedAtMs, nowMs, dist, paceSec, runner, town, legN,
  totalLegs = 18, teamName, onBack, backLabel = '← BACK' }) {
  const ests = lpEstimates(legStartedAtMs, nowMs, dist, paceSec);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: LP_BODY, paddingTop: 52 }}>
      <LPHeader t={t} onBack={onBack} backLabel={backLabel} />
      <LPTitle t={t} runner={runner} town={town} legN={legN} totalLegs={totalLegs} dist={dist} paceSec={paceSec} teamName={teamName} />
      {variant === 'B'
        ? <LPLanes t={t} ests={ests} dist={dist} />
        : <React.Fragment><LPHeroBar t={t} ests={ests} dist={dist} /><LPTable t={t} ests={ests} /></React.Fragment>}
    </div>
  );
}

Object.assign(window, { LegProgress });
