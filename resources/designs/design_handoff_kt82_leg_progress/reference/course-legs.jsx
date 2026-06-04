/* KT82 — "All Legs" course overview screen (Direction B "Course / Bib")
   Shows every leg at once with tappable Google-Maps start/end points,
   the live race clock, a LIVE indicator, and where the team is right now.
   Needs kt82-legs-data.js. Exports window.CourseLegsScreen. */

const CL_DISP = "'Anton', sans-serif";
const CL_BODY = "'Hanken Grotesk', sans-serif";
const CL_MONO = "'JetBrains Mono', monospace";

function clDiff(diff, t) {
  if (diff === 'easy')   return { c: t.green, label: 'EASY' };
  if (diff === 'medium') return { c: t.amber, label: 'MEDIUM' };
  return { c: t.red, label: 'DIFFICULT' };
}

function clDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
              : `${m}:${String(s).padStart(2,'0')}`;
}

function CLPin({ color }) {
  return (
    <svg width="13" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill={color} />
      <circle cx="12" cy="9" r="2.6" fill="#000" fillOpacity="0.55" />
    </svg>
  );
}

// One tappable map point (start or end of a leg → Google Maps).
function CLMapLink({ kind, name, url, t, dot, nameColor, hollow, filled }) {
  const [hov, setHov] = React.useState(false);
  const dotFill = filled && !hollow ? dot : 'transparent';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', columnGap: 10,
        textDecoration: 'none', color: 'inherit', padding: '3px 0' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', justifySelf: 'center',
        background: dotFill, border: `2px solid ${dot}` }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em',
          color: t.faint, display: 'block' }}>{kind === 'start' ? 'START' : 'FINISH'}</span>
        <span style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 14.5, lineHeight: 1.12,
          color: nameColor || t.text, textDecoration: hov ? 'underline' : 'none',
          textUnderlineOffset: 3, display: 'block' }}>{name}</span>
      </span>
      <CLPin color={hov ? dot : t.mut} />
    </a>
  );
}

function CLLegRow({ leg, state, t, last, nextUp }) {
  const d = clDiff(leg.diff, t);
  const isNow = state === 'now', isDone = state === 'done', isNext = state === 'next';
  // rail/marker color: done = green (checked off), now = accent, upcoming = faint hollow
  const sc = isNow ? t.accent : isDone ? t.green : t.faint;
  const bg = isNow ? `${t.accent}1c` : isDone ? `${t.green}10` : 'transparent';
  const nameColor = isNow ? t.text : isDone ? t.mut : t.text;
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '40px 1fr auto', columnGap: 12,
      padding: '13px 12px 13px 16px', background: bg,
      borderRadius: isNow ? 16 : isDone ? 12 : 0, border: isNow ? `1px solid ${t.accent}` : 'none',
      borderBottom: isNow || isDone || last ? 'none' : `1px solid ${t.line2}` }}>

      {/* status stripe down the left edge */}
      <div style={{ position: 'absolute', left: 0, top: isNow || isDone ? 6 : 0, bottom: isNow || isDone ? 6 : 0,
        width: 3, borderRadius: 3, background: isNow ? t.accent : isDone ? t.green : t.line }} />

      {/* leg number + status badge */}
      <div style={{ textAlign: 'center', paddingTop: 2 }}>
        <div style={{ fontFamily: CL_DISP, fontSize: 30, lineHeight: 0.8,
          color: isNow ? t.accent : isDone ? t.mut : t.faint }}>{String(leg.n).padStart(2, '0')}</div>
        {isNow && <div style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 7.5, letterSpacing: '0.1em',
          color: t.ink, background: t.accent, borderRadius: 20, padding: '2px 0', marginTop: 5 }}>LIVE</div>}
        {isDone && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5,
          fontFamily: CL_BODY, fontWeight: 800, fontSize: 7.5, letterSpacing: '0.08em', color: t.green }}>
          <span style={{ width: 13, height: 13, borderRadius: '50%', background: t.green, color: t.ink,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</span>DONE</div>}
        {nextUp && <div style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 7.5, letterSpacing: '0.08em',
          color: t.accent, border: `1px solid ${t.accent}`, borderRadius: 20, padding: '2px 0', marginTop: 5 }}>NEXT</div>}
      </div>

      {/* start → finish map points */}
      <div style={{ minWidth: 0, position: 'relative' }}>
        <CLMapLink kind="start" name={leg.start} url={leg.startUrl} t={t} dot={sc} nameColor={nameColor} hollow={isNext} />
        <div style={{ width: 2, height: 9, background: isDone ? `${t.green}66` : t.line, marginLeft: 5 }} />
        <CLMapLink kind="end" name={leg.end} url={leg.endUrl} t={t} dot={sc} nameColor={nameColor} hollow={isNext} filled />
        <a href={leg.dirUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7, textDecoration: 'none',
            fontFamily: CL_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em',
            color: isNow ? t.accent : t.mut }}>FULL DIRECTIONS <span style={{ fontSize: 11 }}>↗</span></a>
      </div>

      {/* difficulty + mileage */}
      <div style={{ textAlign: 'right', paddingTop: 2, minWidth: 56 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: CL_BODY, fontWeight: 800,
          fontSize: 9, letterSpacing: '0.06em', color: d.c, background: `${d.c}22`, padding: '4px 8px',
          borderRadius: 20, whiteSpace: 'nowrap', opacity: isDone ? 0.7 : 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: d.c }} />{d.label}</span>
        {leg.note && <div style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em',
          color: t.faint, marginTop: 4, textTransform: 'uppercase' }}>{leg.note}</div>}
        <div style={{ fontFamily: CL_MONO, fontWeight: 700, fontSize: 16, color: isDone ? t.mut : t.text, marginTop: leg.note ? 6 : 8 }}>
          {leg.miles.toFixed(2)}<span style={{ fontSize: 10, color: t.mut }}> mi</span></div>
      </div>
    </div>
  );
}

function CourseLegsScreen({ t, currentLeg, raceSec, onBack, backLabel = '← BACK', subtitle }) {
  const K = window.KT82LEGS;
  const legs = K.legs;
  const milesDone = Math.round(legs.filter(l => l.n < currentLeg).reduce((s, l) => s + l.miles, 0) * 10) / 10;
  const pct = Math.min(100, Math.round((milesDone / K.totalMiles) * 100));
  const cur = legs.find(l => l.n === currentLeg) || legs[0];
  const doneCount = currentLeg - 1, toGo = K.count - currentLeg;
  const stateOf = (n) => n < currentLeg ? 'done' : n === currentLeg ? 'now' : 'next';

  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.text, fontFamily: CL_BODY, paddingTop: 52 }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 8px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.mut,
          fontFamily: CL_BODY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap' }}>{backLabel}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="a-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
          <span style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: t.mut }}>LIVE</span>
        </div>
      </div>

      {/* title */}
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', color: t.accent }}>
          KT82 · KATY TRAIL RELAY{subtitle ? ` · ${subtitle}` : ''}</div>
        <div style={{ fontFamily: CL_DISP, fontSize: 50, lineHeight: 0.84, textTransform: 'uppercase', marginTop: 8 }}>The Course</div>
      </div>

      {/* race clock + position */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9 }}>
          <div>
            <div style={{ fontFamily: CL_MONO, fontWeight: 700, fontSize: 26, lineHeight: 0.9 }}>{clDur(raceSec)}</div>
            <div style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', color: t.mut, marginTop: 5 }}>TOTAL RACE TIME</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: CL_MONO, fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
              LEG {currentLeg}<span style={{ fontSize: 11, color: t.mut }}> / {K.count}</span></div>
            <div style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', color: t.faint, marginTop: 6, whiteSpace: 'nowrap' }}>
              {milesDone} OF {K.totalMiles} MI</div>
          </div>
        </div>
        {/* progress bar with a position marker */}
        <div style={{ position: 'relative', height: 8, borderRadius: 20, background: t.line, overflow: 'visible' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: t.accent, borderRadius: 20 }} />
          <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)',
            width: 14, height: 14, borderRadius: '50%', background: t.accent, border: `2.5px solid ${t.bg}`,
            boxShadow: `0 0 0 2px ${t.accent}` }} />
        </div>
        {/* leg tally */}
        <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
          {[{ c: t.green, txt: `✓ ${doneCount} DONE` }, { c: t.accent, txt: `● ON LEG ${currentLeg}` }, { c: t.faint, txt: `${toGo} TO GO` }].map((p, i) => (
            <span key={i} style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.06em',
              color: p.c, background: `${p.c}1c`, padding: '5px 10px', borderRadius: 20 }}>{p.txt}</span>
          ))}
        </div>
        {/* now-running callout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, background: `${t.accent}14`,
          border: `1px solid ${t.accent}55`, borderRadius: 14, padding: '11px 14px' }}>
          <span className="a-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: CL_BODY, fontWeight: 800, fontSize: 9.5, letterSpacing: '0.12em', color: t.accent }}>RACE IN PROGRESS · ON LEG {currentLeg}</div>
            <div style={{ fontFamily: CL_BODY, fontWeight: 700, fontSize: 13, color: t.text, marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.start} → {cur.end}</div>
          </div>
        </div>
      </div>

      {/* column header */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', columnGap: 12, padding: '0 30px 6px',
        fontFamily: CL_BODY, fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: t.faint }}>
        <span style={{ textAlign: 'center' }}>LEG</span>
        <span>START → FINISH</span>
        <span style={{ textAlign: 'right' }}>DIFF · MI</span>
      </div>

      {/* legs */}
      <div style={{ padding: '0 8px 36px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {legs.map((l, i) => <CLLegRow key={l.n} leg={l} state={stateOf(l.n)} t={t} last={i === legs.length - 1} nextUp={l.n === currentLeg + 1} />)}
      </div>
    </div>
  );
}

Object.assign(window, { CourseLegsScreen });
