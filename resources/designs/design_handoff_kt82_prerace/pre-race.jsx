/* KT82 — Pre-Race Landing Screen
   Shown when a team is registered but hasn't started leg 1.
   Builds a per-leg handoff schedule from the team's assigned start time
   plus configured leg distances / runner pace targets.
   Exports: window.PreRaceScreen */

(function () {

const { useState, useEffect, useMemo } = React;
const PR_DISP = "'Anton', sans-serif";
const PR_BODY = "'Hanken Grotesk', sans-serif";
const PR_MONO = "'JetBrains Mono', monospace";

// ── helpers ──────────────────────────────────────────────────────────────────

function prClock(d) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = d.getHours() < 12 ? 'AM' : 'PM';
  return { full: `${h}:${m}`, ap };
}

function prCd(sec) {
  sec = Math.max(0, Math.round(sec));
  return {
    h: String(Math.floor(sec / 3600)).padStart(2, '0'),
    m: String(Math.floor((sec % 3600) / 60)).padStart(2, '0'),
    s: String(sec % 60).padStart(2, '0'),
  };
}

function prDate(d) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[d.getDay()]} · ${mon[d.getMonth()]} ${d.getDate()}`;
}

// ── tappable location → maps ────────────────────────────────────────────────────

// ── trail timeline: nodes (handoffs) + legs (segments) ──────────────────────────

const RAIL = 30; // left rail width

// a handoff point on the trail — time, location, map link
function TrailNode({ time, place, kind, t }) {
  const c = prClock(time);
  const isStart = kind === 'start';
  const isFinish = kind === 'finish';
  const dotColor = isStart || isFinish ? t.accent : t.mut;
  const dotSize = isFinish ? 15 : isStart ? 13 : 9;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 30 }}>
      {/* rail */}
      <div style={{ width: RAIL, flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', top: isStart ? '50%' : 0,
          bottom: isFinish ? '50%' : 0, width: 2, marginLeft: -1, background: t.line,
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: isFinish ? t.accent : t.bg,
          border: `${isFinish ? 0 : 2.5}px solid ${dotColor}`,
          boxShadow: isFinish ? `0 0 0 4px ${t.accent}22` : 'none',
        }} />
      </div>
      {/* content */}
      <a href={t._url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
         style={{
           flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
           padding: '5px 0', textDecoration: 'none',
         }}>
        <div style={{ width: 62, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: PR_MONO, fontWeight: 700, fontSize: 13.5, color: isStart || isFinish ? t.accent : t.text }}>{c.full}</span>
          <span style={{ fontFamily: PR_MONO, fontSize: 8, color: t.faint, marginLeft: 2 }}>{c.ap}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            flex: 1, minWidth: 0, fontFamily: PR_BODY, fontWeight: 700, fontSize: 12.5,
            color: isFinish ? t.accent : t.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {place}
            {isStart && <span style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: '0.1em', color: t.faint, marginLeft: 7 }}>START</span>}
            {isFinish && (
              <span style={{
                fontFamily: PR_BODY, fontWeight: 800, fontSize: 8, letterSpacing: '0.1em',
                background: t.accent, color: t.ink, padding: '2px 6px', borderRadius: 20, marginLeft: 7,
              }}>FINISH</span>
            )}
          </span>
        </div>
      </a>
    </div>
  );
}

// the leg run between two handoffs — hugs the spine, runner leads
function TrailLeg({ leg, runner, mapHref, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* rail (line passes through) */}
      <div style={{ width: RAIL, flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, background: t.line }} />
      </div>
      {/* leg detail, tucked against the spine */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <span style={{
          flexShrink: 0, fontFamily: PR_MONO, fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em',
          color: t.faint, border: `1px solid ${t.line}`, borderRadius: 5, padding: '2px 5px',
        }}>L{leg.n}</span>
        <span style={{
          flex: 1, minWidth: 0, fontFamily: PR_BODY, fontWeight: 700, fontSize: 12.5, color: t.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{runner.name}</span>
        <span style={{ flexShrink: 0, fontFamily: PR_MONO, fontWeight: 500, fontSize: 10.5, color: t.faint }}>{leg.miles} mi</span>
        <a href={mapHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
           title="Open leg route in maps"
           style={{
             flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
             width: 24, height: 24, borderRadius: '50%', border: `1px solid ${t.line}`,
             background: t.panel2, textDecoration: 'none', color: t.mut,
           }}>
          <svg width="8.5" height="11" viewBox="0 0 20 25" fill="none">
            <path d="M10 1C5.59 1 2 4.59 2 9c0 5.57 8 15 8 15s8-9.43 8-15c0-4.41-3.59-8-8-8z" fill="currentColor" />
            <circle cx="10" cy="9" r="2.8" fill={t.panel2} />
          </svg>
        </a>
      </div>
    </div>
  );
}

// builds the interleaved node/leg list from the schedule
function Trail({ schedule, teamStart, t }) {
  const items = [];
  // start node uses leg 1's start location
  const first = schedule[0];
  items.push(
    <TrailNode key="n-start" time={teamStart} place={first.leg.start} kind="start"
      t={{ ...t, _url: first.leg.startUrl }} />
  );
  schedule.forEach((s, i) => {
    const isLast = i === schedule.length - 1;
    items.push(
      <TrailLeg key={`l-${s.leg.n}`} leg={s.leg} runner={s.runner} mapHref={s.leg.startUrl} t={t} />
    );
    items.push(
      <TrailNode key={`n-${s.leg.n}`} time={s.legEnd} place={isLast ? 'Hermann' : s.leg.end}
        kind={isLast ? 'finish' : 'mid'} t={{ ...t, _url: s.leg.endUrl }} />
    );
  });
  return <div>{items}</div>;
}

// ── pre-race screen ──────────────────────────────────────────────────────────────

function PreRaceScreen({ teamName, startTime, t }) {
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // per-leg schedule = team start + cumulative (pace × distance)
  // each leg carries its own start time (= previous handoff) and finish time
  const schedule = useMemo(() => {
    let ms = startTime.getTime();
    return window.KT82LEGS.legs.map((leg, i) => {
      const runner = window.KT82.runners[i % window.KT82.runners.length];
      const legStart = new Date(ms);
      ms += runner.pace * leg.miles * 1000;
      const legEnd = new Date(ms);
      return { leg, runner, legStart, legEnd };
    });
  }, [startTime]);

  const finishTime = schedule[schedule.length - 1].legEnd;
  const sc = prClock(startTime);
  const fc = prClock(finishTime);
  const cd = prCd((startTime.getTime() - nowMs) / 1000);
  const started = startTime.getTime() <= nowMs;
  const dark = t.bg === '#13110a';

  const cdBg = dark ? t.panel2 : '#1a160f';
  const cdNum = started ? t.green : (dark ? t.text : '#ffffff');

  return (
    <div style={{
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.text, fontFamily: PR_BODY,
    }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: '52px 18px 14px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: t.accent, marginBottom: 8 }}>
          KT82 · KATY TRAIL RELAY
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: PR_DISP, fontSize: 47, lineHeight: 0.86, textTransform: 'uppercase' }}>{teamName}</div>
            <div style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 11, color: t.mut, marginTop: 7, letterSpacing: '0.04em' }}>
              {started ? 'RACE IN PROGRESS' : 'PRE-RACE · ESTIMATES ONLY'}
            </div>
          </div>
          <div style={{
            flexShrink: 0, borderRadius: 14, padding: '9px 13px 11px', textAlign: 'center',
            border: `1px solid ${t.line}`, background: dark ? t.panel : '#fff', minWidth: 72,
          }}>
            <div style={{ fontFamily: PR_BODY, fontWeight: 800, fontSize: 8.5, letterSpacing: '0.12em', color: t.mut }}>YOUR START</div>
            <div style={{ fontFamily: PR_MONO, fontWeight: 700, fontSize: 22, color: t.accent, lineHeight: 1, marginTop: 5 }}>{sc.full}</div>
            <div style={{ fontFamily: PR_MONO, fontSize: 10, color: t.mut, marginTop: 2 }}>{sc.ap}</div>
          </div>
        </div>
      </div>

      {/* COUNTDOWN / FANFARE */}
      <div style={{
        flexShrink: 0, background: cdBg, padding: '15px 18px 14px', textAlign: 'center',
        borderBottom: `1px solid ${dark ? t.line : 'rgba(255,255,255,0.08)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 9 }}>
          {!started && <span className="pr-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent }} />}
          <span style={{ fontFamily: PR_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', color: t.accent }}>
            {started ? 'RACE IN PROGRESS' : 'RACE STARTS IN'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontFamily: PR_MONO, fontWeight: 700, lineHeight: 1 }}>
          {[cd.h, cd.m, cd.s].map((v, i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 50, color: cdNum, letterSpacing: '0.02em' }}>{v}</span>
              {i < 2 && <span style={{ fontSize: 38, color: t.accent, opacity: 0.7, padding: '0 2px', marginTop: -4 }}>:</span>}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 38, marginTop: 5 }}>
          {['HRS', 'MIN', 'SEC'].map(l => (
            <span key={l} style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 8.5, letterSpacing: '0.15em', color: dark ? t.faint : 'rgba(255,255,255,0.4)' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: dark ? t.mut : 'rgba(255,255,255,0.5)', marginTop: 11 }}>
          {prDate(startTime)} · GUN AT {sc.full} {sc.ap}
        </div>
      </div>

      {/* HERO: start → finish in Hermann */}
      <div style={{ flexShrink: 0, margin: '14px 16px 0', background: t.accent, borderRadius: 18, padding: '15px 18px 13px', color: t.ink }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: PR_BODY, fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>TEAM START</div>
            <div style={{ fontFamily: PR_MONO, fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {sc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{sc.ap}</span>
            </div>
          </div>
          <div style={{ opacity: 0.45, fontFamily: PR_DISP, fontSize: 20, marginBottom: 4 }}>→</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: PR_BODY, fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>EST. FINISH · HERMANN</div>
            <div style={{ fontFamily: PR_MONO, fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {fc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{fc.ap}</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 10.5, opacity: 0.8, letterSpacing: '0.04em' }}>
            {window.KT82LEGS.totalMiles} MI · {window.KT82LEGS.count} LEGS · 6 RUNNERS
          </span>
          <span style={{
            fontFamily: PR_BODY, fontWeight: 800, fontSize: 8.5, letterSpacing: '0.08em',
            background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 20,
          }}>≈ ESTIMATES</span>
        </div>
      </div>

      {/* LEG SCHEDULE */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 10px' }}>
          <span style={{ fontFamily: PR_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.14em', color: t.mut }}>THE ROUTE</span>
          <span style={{ fontFamily: PR_BODY, fontWeight: 700, fontSize: 9.5, letterSpacing: '0.06em', color: t.faint }}>EST. HANDOFF TIMES</span>
        </div>
        <div style={{ padding: '0 18px' }}>
          <Trail schedule={schedule} teamStart={startTime} t={t} />
        </div>
        <div style={{ padding: '12px 18px 0', textAlign: 'center', fontFamily: PR_BODY, fontWeight: 600, fontSize: 10.5, color: t.faint, lineHeight: 1.5 }}>
          Handoff times are estimates from each runner's target pace.<br />Live tracking begins the moment your team starts leg 1.
        </div>
      </div>

    </div>
  );
}

Object.assign(window, { PreRaceScreen });

})();
