export interface CourseLeg {
  legNumber: number
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  miles: number
  routeCoords: [number, number][]   // [lat, lng] pairs tracing the road route
}

export const COURSE_LEGS: CourseLeg[] = [
  { legNumber: 1,  startName: 'Maryland Heights Aquaport',                startLat: 38.72545,    startLng: -90.44608,   endName: 'Lakehouse 364',                                    endLat: 38.7009544,  endLng: -90.496994,   miles: 5.10,
    routeCoords: [[38.7253345,-90.4465133],[38.7255437,-90.4468352],[38.7271591,-90.4476613],[38.7271424,-90.448069],[38.7283058,-90.4513306],[38.7286208,-90.4521023],[38.7287225,-90.4528836],[38.7293425,-90.4547064],[38.7311495,-90.457213],[38.7312709,-90.4574031],[38.7312035,-90.4582329],[38.7316754,-90.4588725],[38.7318507,-90.4606876],[38.7323901,-90.4611198],[38.7323767,-90.4622261],[38.7324446,-90.4625553],[38.7327742,-90.4631823],[38.7325509,-90.4638775],[38.7326466,-90.4642319],[38.7326795,-90.4643028],[38.7329359,-90.4651313],[38.7326385,-90.4657494],[38.7322897,-90.466157],[38.7328949,-90.4666699],[38.7334796,-90.4669592],[38.7338079,-90.4675904],[38.7342182,-90.4681427],[38.7342079,-90.4685635],[38.7316537,-90.4758092],[38.7316905,-90.4758395],[38.7309519,-90.4769967],[38.7305416,-90.4782459],[38.729803,-90.479561],[38.7291875,-90.4798897],[38.7286232,-90.4806261],[38.7281411,-90.4813494],[38.7275871,-90.4819806],[38.7269613,-90.4825329],[38.7264278,-90.4824803],[38.7262124,-90.4821384],[38.7260175,-90.48202],[38.7256789,-90.48202],[38.7253096,-90.4821516],[38.7250429,-90.4824146],[38.724183,-90.4829011],[38.7238794,-90.4831028],[38.7220578,-90.4805086],[38.7211133,-90.4796438],[38.7181349,-90.4781594],[38.7165493,-90.478145],[38.712387,-90.4799055],[38.7110149,-90.4802514],[38.7094067,-90.4811305],[38.7083045,-90.4818367],[38.7058955,-90.4835309],[38.7058843,-90.4889721],[38.7059292,-90.4898945],[38.7049507,-90.4906728],[38.7052207,-90.4930941],[38.7047535,-90.4934123],[38.7042811,-90.4942482],[38.7042586,-90.4949256],[38.70391,-90.4953436],[38.703685,-90.4955886],[38.7037525,-90.4960498],[38.7037661,-90.4961038],[38.7026908,-90.4964418],[38.7001142,-90.4970137]] },
  { legNumber: 2,  startName: 'Lakehouse 364',                            startLat: 38.7009544,  startLng: -90.496994,  endName: '364 Access',                                       endLat: 38.741153,   endLng: -90.524274,   miles: 3.93,
    routeCoords: [[38.7005986,-90.4968647],[38.7024481,-90.4964575],[38.7035819,-90.4962369],[38.7037599,-90.4959763],[38.7037217,-90.4955284],[38.7042365,-90.4949502],[38.7042047,-90.4942824],[38.7046623,-90.4935495],[38.7051326,-90.4932319],[38.7057365,-90.493183],[38.7059081,-90.4934925],[38.7062004,-90.4976377],[38.706015,-90.4984795],[38.70564,-90.5002304],[38.7057608,-90.5015823],[38.7059895,-90.5033739],[38.7068091,-90.5047619],[38.7071841,-90.5052261],[38.708741,-90.5060079],[38.7112462,-90.5073289],[38.7165293,-90.5100434],[38.7179932,-90.5108171],[38.7183998,-90.5115582],[38.7185396,-90.5122341],[38.7186985,-90.5123563],[38.7192004,-90.51234],[38.7193402,-90.5123319],[38.7197937,-90.5119784],[38.7201686,-90.5120924],[38.7229388,-90.5135502],[38.727623,-90.5163803],[38.7288389,-90.5172586],[38.729595,-90.517454],[38.729938,-90.5176983],[38.7309037,-90.518472],[38.7310816,-90.5184476],[38.7311578,-90.5183091],[38.7315961,-90.5172504],[38.731558,-90.516941],[38.7313928,-90.5168188],[38.7311768,-90.5168351],[38.7310307,-90.5170061],[38.7310244,-90.5173237],[38.7313865,-90.5176576],[38.735646,-90.5210318],[38.7383676,-90.5232018],[38.7395197,-90.5241139],[38.7400342,-90.5242523],[38.7402057,-90.5242116],[38.7403264,-90.5240243]] },
  { legNumber: 3,  startName: '364 Access',                               startLat: 38.741153,   startLng: -90.524274,  endName: 'Greens Bottom Road Trailhead',                     endLat: 38.714401,   endLng: -90.56675,    miles: 3.20,
    routeCoords: [[38.741153, -90.524274], [38.714401, -90.56675]] },
  { legNumber: 4,  startName: 'Greens Bottom Road Trailhead',             startLat: 38.714401,   startLng: -90.56675,   endName: 'MO Research Park / Busch Greenway',                endLat: 38.6946466,  endLng: -90.6843187,  miles: 7.24,
    routeCoords: [[38.714401, -90.56675], [38.6946466, -90.6843187]] },
  { legNumber: 5,  startName: 'MO Research Park / Busch Greenway',        startLat: 38.6946466,  startLng: -90.6843187, endName: 'Lewis & Clark Trailhead',                          endLat: 38.69111,    endLng: -90.72442,    miles: 4.72,
    routeCoords: [[38.6946466, -90.6843187], [38.69111, -90.72442]] },
  { legNumber: 6,  startName: 'Lewis & Clark Trailhead',                  startLat: 38.69111,    startLng: -90.72442,   endName: 'Weldon Spring Trailhead',                          endLat: 38.659962,   endLng: -90.743787,   miles: 5.89,
    routeCoords: [[38.69111, -90.72442], [38.659962, -90.743787]] },
  { legNumber: 7,  startName: 'Weldon Spring Trailhead',                  startLat: 38.659962,   startLng: -90.743787,  endName: 'Weldon Spring Conservation Area (Lost Valley)',    endLat: 38.6614265,  endLng: -90.75767,    miles: 5.73,
    routeCoords: [[38.659962, -90.743787], [38.6614265, -90.75767]] },
  { legNumber: 8,  startName: 'Weldon Spring Conservation Area (Lost Valley)', startLat: 38.6614265, startLng: -90.75767, endName: 'Matson',                                         endLat: 38.608612,   endLng: -90.79485,    miles: 4.43,
    routeCoords: [[38.6614265, -90.75767], [38.608612, -90.79485]] },
  { legNumber: 9,  startName: 'Matson',                                   startLat: 38.608612,   startLng: -90.79485,   endName: 'Klondike Park',                                    endLat: 38.58024,    endLng: -90.83944,    miles: 3.61,
    routeCoords: [[38.608612, -90.79485], [38.58024, -90.83944]] },
  { legNumber: 10, startName: 'Klondike Park',                            startLat: 38.58024,    startLng: -90.83944,   endName: 'Augusta',                                          endLat: 38.569882,   endLng: -90.881067,   miles: 2.58,
    routeCoords: [[38.58024, -90.83944], [38.569882, -90.881067]] },
  { legNumber: 11, startName: 'Augusta',                                  startLat: 38.569882,   startLng: -90.881067,  endName: 'Dutzow',                                           endLat: 38.602628,   endLng: -90.999058,   miles: 7.56,
    routeCoords: [[38.569882, -90.881067], [38.602628, -90.999058]] },
  { legNumber: 12, startName: 'Dutzow',                                   startLat: 38.602628,   startLng: -90.999058,  endName: 'Marthasville',                                     endLat: 38.627633,   endLng: -91.060658,   miles: 3.67,
    routeCoords: [[38.602628, -90.999058], [38.627633, -91.060658]] },
  { legNumber: 13, startName: 'Marthasville',                             startLat: 38.627633,   startLng: -91.060658,  endName: 'Treloar',                                          endLat: 38.643583,   endLng: -91.188267,   miles: 6.96,
    routeCoords: [[38.627633, -91.060658], [38.643583, -91.188267]] },
  { legNumber: 14, startName: 'Treloar',                                  startLat: 38.643583,   startLng: -91.188267,  endName: 'Bernheimer Road',                                  endLat: 38.66808,    endLng: -91.25537,    miles: 4.17,
    routeCoords: [[38.643583, -91.188267], [38.66808, -91.25537]] },
  { legNumber: 15, startName: 'Bernheimer Road',                          startLat: 38.66808,    startLng: -91.25537,   endName: 'Gore-Case Community Center',                       endLat: 38.72521,    endLng: -91.34014,    miles: 6.14,
    routeCoords: [[38.66808, -91.25537], [38.72521, -91.34014]] },
  { legNumber: 16, startName: 'Gore-Case Community Center',               startLat: 38.72521,    startLng: -91.34014,   endName: 'Case Road',                                        endLat: 38.73476,    endLng: -91.37289,    miles: 2.69,
    routeCoords: [[38.72521, -91.34014], [38.73476, -91.37289]] },
  { legNumber: 17, startName: 'Case Road',                                startLat: 38.73476,    startLng: -91.37289,   endName: 'McKittrick',                                       endLat: 38.73410,    endLng: -91.44449,    miles: 3.89,
    routeCoords: [[38.73476, -91.37289], [38.73410, -91.44449]] },
  { legNumber: 18, startName: 'McKittrick',                               startLat: 38.73410,    startLng: -91.44449,   endName: 'Hermann & Finish!!',                               endLat: 38.70396,    endLng: -91.43376,    miles: 3.15,
    routeCoords: [[38.73410, -91.44449], [38.70396, -91.43376]] },
]

export const TOTAL_COURSE_MILES = 84.66

export interface LegDifficulty {
  tier: 'easy' | 'medium' | 'difficult'
  note?: 'distance' | 'single-track'
}

export const LEG_DIFFICULTY: Record<number, LegDifficulty> = {
  1:  { tier: 'medium' },
  2:  { tier: 'medium' },
  3:  { tier: 'easy' },
  4:  { tier: 'difficult', note: 'distance' },
  5:  { tier: 'difficult', note: 'single-track' },
  6:  { tier: 'difficult', note: 'single-track' },
  7:  { tier: 'difficult', note: 'single-track' },
  8:  { tier: 'medium' },
  9:  { tier: 'easy' },
  10: { tier: 'easy' },
  11: { tier: 'difficult', note: 'distance' },
  12: { tier: 'medium' },
  13: { tier: 'difficult', note: 'distance' },
  14: { tier: 'medium' },
  15: { tier: 'difficult', note: 'distance' },
  16: { tier: 'easy' },
  17: { tier: 'medium' },
  18: { tier: 'medium' },
}

export function mapPoint(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function mapRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): string {
  return `https://www.google.com/maps/dir/${a.lat},${a.lng}/${b.lat},${b.lng}`
}

// Returns the [lat, lng] position at fraction frac (0–1) along a polyline.
// Uses Euclidean degree distance — sufficient for the short leg distances involved.
export function lerpAlongPolyline(
  coords: [number, number][],
  frac: number
): [number, number] {
  if (coords.length === 0) return [0, 0]
  if (coords.length === 1) return coords[0]
  if (frac <= 0) return coords[0]
  if (frac >= 1) return coords[coords.length - 1]

  const dists: number[] = []
  let totalLen = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const dlat = coords[i + 1][0] - coords[i][0]
    const dlng = coords[i + 1][1] - coords[i][1]
    const d = Math.sqrt(dlat * dlat + dlng * dlng)
    dists.push(d)
    totalLen += d
  }

  if (totalLen === 0) return coords[0]

  const target = frac * totalLen
  let cum = 0
  for (let i = 0; i < dists.length; i++) {
    if (cum + dists[i] >= target) {
      const t = dists[i] === 0 ? 0 : (target - cum) / dists[i]
      return [
        coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
      ]
    }
    cum += dists[i]
  }
  return coords[coords.length - 1]
}
