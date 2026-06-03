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
    routeCoords: [[38.72545, -90.44608], [38.7009544, -90.496994]] },
  { legNumber: 2,  startName: 'Lakehouse 364',                            startLat: 38.7009544,  startLng: -90.496994,  endName: '364 Access',                                       endLat: 38.741153,   endLng: -90.524274,   miles: 3.93,
    routeCoords: [[38.7009544, -90.496994], [38.741153, -90.524274]] },
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
