/* KT82 — Katy Trail Relay shared race data
   82 miles · 18 legs · 6 runners (3 legs each)
   Parameterized, internally-consistent per-team schedule builder.
   Attaches window.KT82. */
(function () {
  const RACE_START = new Date('2026-05-16T06:00:00');

  // 6 runners, rotate through legs: runner = (legNumber-1) % 6
  const RUNNERS = [
    { id: 'r1', name: 'Maya Reyes',    initials: 'MR', pace: 470 }, // 7:50
    { id: 'r2', name: 'Dev Patel',     initials: 'DP', pace: 510 }, // 8:30
    { id: 'r3', name: 'Priya Shah',    initials: 'PS', pace: 548 }, // 9:08
    { id: 'r4', name: 'Sam Okafor',    initials: 'SO', pace: 486 }, // 8:06
    { id: 'r5', name: 'Theo Walsh',    initials: 'TW', pace: 578 }, // 9:38
    { id: 'r6', name: 'Nora Lindqvist',initials: 'NL', pace: 532 }, // 8:52
  ];

  // 18 handoffs along the central Katy Trail, distances sum to 82.0
  const LEGS = [
    { town: 'Boonville', dist: 4.6 }, { town: 'New Franklin', dist: 4.2 },
    { town: 'Rocheport', dist: 5.1 }, { town: 'Huntsdale', dist: 3.8 },
    { town: 'McBaine', dist: 4.4 }, { town: 'Easley', dist: 5.3 },
    { town: 'Providence', dist: 4.0 }, { town: 'Hartsburg', dist: 4.8 },
    { town: 'Wilton', dist: 4.5 }, { town: 'Claysville', dist: 3.9 },
    { town: 'North Jefferson', dist: 5.0 }, { town: 'Tebbetts', dist: 4.3 },
    { town: 'Mokane', dist: 4.7 }, { town: 'Steedman', dist: 4.1 },
    { town: 'Portland', dist: 5.2 }, { town: 'Bluffton', dist: 4.4 },
    { town: 'Rhineland', dist: 4.6 }, { town: 'Treloar', dist: 5.1 },
  ];

  const VARIANCE = [1.02, 0.97, 1.05, 0.96, 1.0, 1.07, 0.95, 1.06]; // Trail Mix completed legs

  // deterministic ~0.94..1.07 variance for a (seed, leg)
  function varianceFor(seed, n) {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    const f = x - Math.floor(x); // 0..1
    return 0.94 + f * 0.13;
  }

  function targetSecFor(n) {
    const meta = LEGS[n - 1];
    return RUNNERS[(n - 1) % 6].pace * meta.dist;
  }

  // Build one team's full schedule. currentLeg is 1-indexed.
  function buildTeam({ currentLeg = 9, paceMult = 1.0, coveredFrac = 0.58, seed = 1, varianceArr = null } = {}) {
    let t = RACE_START.getTime();
    let now = null;
    const rows = [];
    for (let i = 0; i < LEGS.length; i++) {
      const n = i + 1;
      const meta = LEGS[i];
      const runner = RUNNERS[(n - 1) % 6];
      const targetSec = runner.pace * meta.dist;
      const startedAt = new Date(t);
      const row = { n, town: meta.town, dist: meta.dist, runner, targetSec, startedAt };

      if (n < currentLeg) {
        const v = varianceArr ? varianceArr[i] : varianceFor(seed, n);
        const durSec = targetSec * v;
        const finishedAt = new Date(t + durSec * 1000);
        t = finishedAt.getTime();
        row.status = 'done';
        row.actualSec = durSec;
        row.arrival = finishedAt;
        row.delta = Math.round((durSec - targetSec) / 60);
      } else if (n === currentLeg) {
        const projSec = targetSec * paceMult;
        const projFinish = new Date(t + projSec * 1000);
        const targetFinish = new Date(t + targetSec * 1000);
        const elapsedSec = projSec * coveredFrac;
        now = new Date(t + elapsedSec * 1000);
        row.status = 'now';
        row.arrival = projFinish;
        row.targetArrival = targetFinish;
        row.distDone = Math.round(meta.dist * coveredFrac * 10) / 10;
        row.distLeft = Math.round((meta.dist - row.distDone) * 10) / 10;
        row.elapsedSec = elapsedSec;
        row.delta = Math.round((projFinish - targetFinish) / 60000);
        t = projFinish.getTime();
      } else {
        const projFinish = new Date(t + targetSec * 1000);
        row.status = 'next';
        row.arrival = projFinish;
        t = projFinish.getTime();
      }
      rows.push(row);
    }
    const current = rows.find(r => r.status === 'now');
    const doneCount = currentLeg - 1;
    const milesToGo = Math.round((current.distLeft + rows.filter(r => r.status === 'next').reduce((s, r) => s + r.dist, 0)) * 10) / 10;
    const milesDone = Math.round((82.0 - milesToGo) * 10) / 10;
    const raceElapsedSec = Math.round((now.getTime() - RACE_START.getTime()) / 1000);
    return { rows, now, current, doneCount, milesToGo, milesDone, raceElapsedSec, raceStart: RACE_START };
  }

  // focus team (Trail Mix) — keeps the canvas/static screens identical
  const trailMix = buildTeam({ currentLeg: 9, paceMult: 1.07, coveredFrac: 0.58, varianceArr: VARIANCE });

  function navUrl(town) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(town + ' Trailhead, Katy Trail, Missouri');
  }
  function clock(d) {
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    const ap = d.getHours() < 12 ? 'AM' : 'PM';
    return { h, m, ap, full: `${h}:${m}`, ampm: ap };
  }
  function dur(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
                 : `${m}:${s.toString().padStart(2,'0')}`;
  }
  function pace(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  const PACE_MULT = { ahead: 0.95, 'on-pace': 1.0, overdue: 1.07 };

  // all teams on course — each gets its own internally-consistent timeline
  const TEAM_CFG = [
    { id: 'trailmix', name: 'Trail Mix',    leg: 9,  status: 'overdue', seed: 3, focus: true },
    { id: 'striders', name: 'The Striders', leg: 11, status: 'ahead',   seed: 7 },
    { id: 'sole',     name: 'Sole Patrol',  leg: 8,  status: 'on-pace', seed: 11 },
    { id: 'katydid',  name: 'Katy Did',     leg: 10, status: 'on-pace', seed: 5 },
    { id: 'pacemkr',  name: 'Pace Makers',  leg: 7,  status: 'on-pace', seed: 9 },
    { id: 'backpack', name: 'Back of Pack', leg: 6,  status: 'overdue', seed: 13 },
  ];

  const TEAMS = TEAM_CFG.map(cfg => {
    const tl = cfg.focus ? trailMix
      : buildTeam({ currentLeg: cfg.leg, paceMult: PACE_MULT[cfg.status], coveredFrac: 0.5, seed: cfg.seed });
    return {
      id: cfg.id, name: cfg.name, status: cfg.status, focus: !!cfg.focus,
      leg: cfg.leg, done: cfg.leg - 1,
      runner: tl.current.runner.name, next: tl.current.town,
      eta: tl.current.arrival, toGo: tl.milesToGo,
      timeline: tl,
    };
  });

  window.KT82 = {
    raceName: 'KT82', raceSub: 'Katy Trail Relay', raceDate: 'Sat · May 16',
    totalMiles: 82.0, totalLegs: 18, raceStart: RACE_START,
    now: trailMix.now, rows: trailMix.rows, current: trailMix.current,
    doneCount: trailMix.doneCount, milesToGo: trailMix.milesToGo,
    milesDone: trailMix.milesDone, raceElapsedSec: trailMix.raceElapsedSec,
    teams: TEAMS, runners: RUNNERS, legs: LEGS,
    buildTeam, targetSecFor, navUrl,
    fmt: { clock, dur, pace },
  };
})();
