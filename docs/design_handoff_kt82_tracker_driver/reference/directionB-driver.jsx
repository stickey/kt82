/* Direction B — Driver (race-day timing, in support vehicle)
   Screens: DriverStart, DriverTiming, DriverComplete. Props {theme, holding}.
   Reuses tokB / Avatar / NavPin / statusColorB / statusTextB from directionB.jsx. */

const DB_DISP = "'Anton', sans-serif";
const DB_BODY = "'Hanken Grotesk', sans-serif";
const DB_MONO = "'JetBrains Mono', monospace";

function HoldButton({ label, fill = 0, color, ink, t, height = 78, fontSize = 30 }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: color,
      height, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      boxShadow: fill > 0 ? `0 0 0 2px ${color}` : 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fill * 100}%`,
        background: 'rgba(255,255,255,0.24)' }} />
      <span style={{ position: 'relative', fontFamily: DB_DISP, fontSize, letterSpacing: '0.04em',
        color: ink, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function DriverTop({ t, right, rightColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 18px 12px', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: t.accent }} />
        <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em' }}>TRAIL MIX</span>
      </div>
      <span style={{ fontFamily: DB_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: rightColor || t.mut }}>{right}</span>
    </div>
  );
}

function DriverTiming({ theme = 'dark', holding = false }) {
  const t = window.tokB(theme), K = window.KT82, cur = K.current;
  const c = K.fmt.clock(cur.arrival);
  const sc = window.statusColorB(cur.delta > 0 ? 'overdue' : 'on-pace', t);
  const nextRow = K.rows[cur.n] || null;
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: DB_BODY, paddingTop: 50,
      display: 'flex', flexDirection: 'column' }}>
      <DriverTop t={t} right={`RACE  ${K.fmt.dur(K.raceElapsedSec)}`} />

      <div style={{ padding: '16px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* now running */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>NOW RUNNING · LEG {cur.n}</span>
          <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 10.5, letterSpacing: '0.08em',
            color: t.ink, background: sc, padding: '4px 9px', borderRadius: 20 }}>
            {cur.delta > 0 ? `${cur.delta} MIN BEHIND` : window.statusTextB('on-pace')}</span>
        </div>
        <div style={{ fontFamily: DB_DISP, fontSize: 50, lineHeight: 0.9, textTransform: 'uppercase', marginTop: 8 }}>{cur.runner.name}</div>
        <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.06em', color: t.mut, marginTop: 8 }}>→ {cur.town.toUpperCase()} · {cur.dist} MI</div>

        {/* twin readouts */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: t.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${t.line}` }}>
            <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: t.mut }}>LEG TIME</div>
            <div style={{ fontFamily: DB_MONO, fontWeight: 700, fontSize: 38, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em' }}>{K.fmt.dur(cur.elapsedSec)}</div>
          </div>
          <div style={{ flex: 1, background: t.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${sc}55` }}>
            <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: sc }}>ETA · {cur.town.toUpperCase()}</div>
            <div style={{ fontFamily: DB_MONO, fontWeight: 700, fontSize: 38, lineHeight: 1, marginTop: 8, color: sc, letterSpacing: '-0.02em' }}>{c.full}<span style={{ fontSize: 16 }}>{c.ap.toLowerCase()}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: DB_MONO, fontSize: 11, color: t.faint, marginTop: 8 }}>
          <span>{cur.distLeft} mi to handoff</span>
          <span>target {K.fmt.pace(cur.runner.pace)}/mi</span>
        </div>

        {/* on deck */}
        {nextRow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, background: t.panel2,
            borderRadius: 14, padding: '10px 14px' }}>
            <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 9.5, lineHeight: 1.15, letterSpacing: '0.1em', color: t.accent, flexShrink: 0 }}>ON<br/>DECK</span>
            <window.Avatar initials={nextRow.runner.initials} color={t.accent} ink={t.ink} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 14 }}>{nextRow.runner.name}</div>
              <div style={{ fontFamily: DB_BODY, fontWeight: 600, fontSize: 11, color: t.mut, marginTop: 2 }}>Leg {nextRow.n} · {nextRow.dist} mi → {nextRow.town}</div>
            </div>
          </div>
        )}

        {/* navigate */}
        <a href={K.navUrl(cur.town)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14,
            border: `1.5px solid ${t.accent}`, borderRadius: 16, padding: '13px 18px', textDecoration: 'none', color: t.accent }}>
          <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>NAVIGATE TO {cur.town.toUpperCase()}</span>
          <span style={{ fontSize: 18 }}>↗</span>
        </a>

        <div style={{ flex: 1, minHeight: 14 }} />

        {/* LAP long-press */}
        <HoldButton label={holding ? 'KEEP HOLDING…' : 'LAP'} fill={holding ? 0.62 : 0}
          color={t.accent} ink={t.ink} t={t} height={84} fontSize={holding ? 22 : 34} />
        <div style={{ textAlign: 'center', fontFamily: DB_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: t.faint, margin: '8px 0 12px' }}>
          {holding ? 'RECORDING HANDOFF AT WILTON' : 'HOLD TO RECORD HANDOFF'}</div>

        {/* end race */}
        <div style={{ paddingBottom: 14 }}>
          <HoldButton label="••• END RACE EARLY" fill={0} color={t.panel2} ink={t.mut} t={t} height={46} fontSize={14} />
        </div>
      </div>
    </div>
  );
}

function DriverStart({ theme = 'dark' }) {
  const t = window.tokB(theme), K = window.KT82;
  const first = K.rows[0];
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: DB_BODY, paddingTop: 50,
      display: 'flex', flexDirection: 'column' }}>
      <DriverTop t={t} right="RACE NOT STARTED" />
      <div style={{ padding: '20px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', color: t.accent }}>{K.raceName} · {K.raceSub.toUpperCase()}</div>
        <div style={{ fontFamily: DB_DISP, fontSize: 60, lineHeight: 0.86, textTransform: 'uppercase', marginTop: 8 }}>Ready<br/>to roll</div>
        <div style={{ fontFamily: DB_BODY, fontWeight: 600, fontSize: 13, color: t.mut, marginTop: 12 }}>
          {K.totalMiles} miles · {K.totalLegs} legs · 6 runners. Hold START when the gun goes off — it starts the clock for the whole team.</div>

        {/* first leg card */}
        <div style={{ marginTop: 22, background: t.panel, border: `1px solid ${t.line}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: t.mut }}>FIRST LEG · UP NOW</span>
            <span style={{ fontFamily: DB_DISP, fontSize: 24, color: t.accent }}>01</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <window.Avatar initials={first.runner.initials} color={t.accent} ink={t.ink} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: DB_DISP, fontSize: 30, lineHeight: 0.9, textTransform: 'uppercase' }}>{first.runner.name}</div>
              <div style={{ fontFamily: DB_BODY, fontWeight: 700, fontSize: 12, color: t.mut, marginTop: 5 }}>→ {first.town} · {first.dist} mi · target {K.fmt.pace(first.runner.pace)}/mi</div>
            </div>
          </div>
          <a href={K.navUrl(first.town)} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px',
              borderTop: `1px solid ${t.line}`, background: t.panel2, textDecoration: 'none', color: t.accent }}>
            <span style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 13, letterSpacing: '0.04em' }}>NAVIGATE TO {first.town.toUpperCase()}</span>
            <span style={{ fontSize: 17 }}>↗</span>
          </a>
        </div>

        <div style={{ flex: 1, minHeight: 18 }} />

        <HoldButton label="START" fill={0} color={t.accent} ink={t.ink} t={t} height={92} fontSize={40} />
        <div style={{ textAlign: 'center', fontFamily: DB_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: t.faint, margin: '10px 0 18px' }}>
          HOLD TO START THE RACE CLOCK</div>
      </div>
    </div>
  );
}

function DriverComplete({ theme = 'dark' }) {
  const t = window.tokB(theme), K = window.KT82;
  const splits = K.rows.map(r => ({ ...r, sec: r.actualSec || r.targetSec }));
  const totalSec = splits.reduce((s, r) => s + r.sec, 0);
  const finish = new Date(K.raceStart.getTime() + totalSec * 1000);
  const fc = K.fmt.clock(finish);
  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: DB_BODY, paddingTop: 50 }}>
      <DriverTop t={t} right="FINISHED ✓" rightColor={t.green} />
      <div style={{ padding: '22px 18px 6px' }}>
        <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', color: t.green }}>RACE COMPLETE</div>
        <div style={{ fontFamily: DB_MONO, fontWeight: 700, fontSize: 56, lineHeight: 0.9, marginTop: 10, letterSpacing: '-0.03em' }}>{K.fmt.dur(totalSec)}</div>
        <div style={{ fontFamily: DB_BODY, fontWeight: 700, fontSize: 12.5, color: t.mut, marginTop: 8 }}>
          {K.totalMiles} mi · {K.totalLegs} legs · finished {fc.full} {fc.ap}</div>
      </div>
      <div style={{ padding: '18px 18px 8px' }}>
        <span style={{ fontFamily: DB_DISP, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Splits</span>
      </div>
      <div style={{ padding: '0 18px 16px' }}>
        {splits.map((r, i) => (
          <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i === splits.length - 1 ? 'none' : `1px solid ${t.line2}` }}>
            <span style={{ fontFamily: DB_DISP, fontSize: 20, width: 26, color: t.faint, textAlign: 'center' }}>{String(r.n).padStart(2, '0')}</span>
            <window.Avatar initials={r.runner.initials} color={t.panel2} ink={t.mut} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: DB_BODY, fontWeight: 800, fontSize: 14 }}>{r.runner.name}</div>
              <div style={{ fontFamily: DB_BODY, fontWeight: 600, fontSize: 11, color: t.faint, marginTop: 1 }}>{r.town} · {r.dist} mi</div>
            </div>
            <span style={{ fontFamily: DB_MONO, fontWeight: 700, fontSize: 15 }}>{K.fmt.dur(r.sec)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 18px 30px' }}>
        <HoldButton label="SHARE RESULTS →" fill={0} color={t.accent} ink={t.ink} t={t} height={56} fontSize={18} />
      </div>
    </div>
  );
}

Object.assign(window, { DriverStart, DriverTiming, DriverComplete });
