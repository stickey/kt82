/* KT82 — real course leg data (the 18 official legs)
   Names + difficulty + mileage from resources/race/kt82-legs.png
   Start/End map points + per-leg directions from resources/KT82legs.csv
   Attaches window.KT82LEGS. */
(function () {
  // diff tiers: 'easy' | 'medium' | 'hard'; note clarifies a hard leg.
  const LEGS = [
    { n: 1,  start: 'Maryland Heights Aquaport', end: 'Lakehouse 364',
      s: '38.72545,-90.44608',      e: '38.7009544,-90.496994',  diff: 'medium', miles: 5.10 },
    { n: 2,  start: 'Lakehouse 364', end: '364 Access',
      s: '38.7009544,-90.496994',   e: '38.741153,-90.524274',   diff: 'medium', miles: 3.93 },
    { n: 3,  start: '364 Access', end: 'Greens Bottom Road Trailhead',
      s: '38.741153,-90.524274',    e: '38.714401,-90.56675',    diff: 'easy',   miles: 3.20 },
    { n: 4,  start: 'Greens Bottom Road Trailhead', end: 'MO Research Park / Busch Greenway',
      s: '38.714401,-90.56675',     e: '38.6946466,-90.6843187', diff: 'hard', note: 'distance', miles: 7.24 },
    { n: 5,  start: 'MO Research Park / Busch Greenway', end: 'Lewis & Clark Trailhead',
      s: '38.6946466,-90.6843187',  e: '38.69111,-90.72442',     diff: 'hard', note: 'single track', miles: 4.72 },
    { n: 6,  start: 'Lewis & Clark Trailhead', end: 'Weldon Spring Trailhead',
      s: '38.69111,-90.72442',      e: '38.659962,-90.743787',   diff: 'hard', note: 'single track', miles: 5.89 },
    { n: 7,  start: 'Weldon Spring Trailhead', end: 'Weldon Spring Conservation Area (Lost Valley)',
      s: '38.659962,-90.743787',    e: '38.6614265,-90.75767',   diff: 'hard', note: 'single track', miles: 5.73 },
    { n: 8,  start: 'Weldon Spring Conservation Area (Lost Valley)', end: 'Matson',
      s: '38.6614265,-90.75767',    e: '38.608612,-90.79485',    diff: 'medium', miles: 4.43 },
    { n: 9,  start: 'Matson', end: 'Klondike Park',
      s: '38.608612,-90.79485',     e: '38.58024,-90.83944',     diff: 'easy',   miles: 3.61 },
    { n: 10, start: 'Klondike Park', end: 'Augusta',
      s: '38.58024,-90.83944',      e: '38.569882,-90.881067',   diff: 'easy',   miles: 2.58 },
    { n: 11, start: 'Augusta', end: 'Dutzow',
      s: '38.569882,-90.881067',    e: '38.602628,-90.999058',   diff: 'hard', note: 'distance', miles: 7.56 },
    { n: 12, start: 'Dutzow', end: 'Marthasville',
      s: '38.602628,-90.999058',    e: '38.627633,-91.060658',   diff: 'medium', miles: 3.67 },
    { n: 13, start: 'Marthasville', end: 'Treloar',
      s: '38.627633,-91.060658',    e: '38.643583,-91.188267',   diff: 'hard', note: 'distance', miles: 6.96 },
    { n: 14, start: 'Treloar', end: 'Bernheimer Road',
      s: '38.643583,-91.188267',    e: '38.66808,-91.25537',     diff: 'medium', miles: 4.17 },
    { n: 15, start: 'Bernheimer Road', end: 'Gore-Case Community Center',
      s: '38.66808,-91.25537',      e: '38.72521,-91.34014',     diff: 'hard', note: 'distance', miles: 6.14 },
    { n: 16, start: 'Gore-Case Community Center', end: 'Case Road',
      s: '38.72521,-91.34014',      e: '38.73476,-91.37289',     diff: 'easy',   miles: 2.69 },
    { n: 17, start: 'Case Road', end: 'McKittrick',
      s: '38.73476,-91.37289',      e: '38.73410,-91.44449',     diff: 'medium', miles: 3.89 },
    { n: 18, start: 'McKittrick', end: 'Hermann & Finish!!',
      s: '38.73410,-91.44449',      e: '38.70396,-91.43376',     diff: 'medium', miles: 3.15 },
  ];

  const pt  = (ll) => 'https://www.google.com/maps?q=' + ll;
  const dir = (a, b) => 'https://www.google.com/maps/dir/' + a + '/' + b;

  const legs = LEGS.map(l => ({
    ...l,
    startUrl: pt(l.s),
    endUrl: pt(l.e),
    dirUrl: dir(l.s, l.e),
  }));

  const totalMiles = Math.round(legs.reduce((s, l) => s + l.miles, 0) * 10) / 10;

  window.KT82LEGS = { legs, totalMiles, count: legs.length };
})();
