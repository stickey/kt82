export interface CourseLeg {
  legNumber: number
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  miles: number
}

export const COURSE_LEGS: CourseLeg[] = [
  { legNumber: 1,  startName: 'Maryland Heights Aquaport',                startLat: 38.72545,    startLng: -90.44608,   endName: 'Lakehouse 364',                                    endLat: 38.7009544,  endLng: -90.496994,   miles: 5.10 },
  { legNumber: 2,  startName: 'Lakehouse 364',                            startLat: 38.7009544,  startLng: -90.496994,  endName: '364 Access',                                       endLat: 38.741153,   endLng: -90.524274,   miles: 3.93 },
  { legNumber: 3,  startName: '364 Access',                               startLat: 38.741153,   startLng: -90.524274,  endName: 'Greens Bottom Road Trailhead',                     endLat: 38.714401,   endLng: -90.56675,    miles: 3.20 },
  { legNumber: 4,  startName: 'Greens Bottom Road Trailhead',             startLat: 38.714401,   startLng: -90.56675,   endName: 'MO Research Park / Busch Greenway',                endLat: 38.6946466,  endLng: -90.6843187,  miles: 7.24 },
  { legNumber: 5,  startName: 'MO Research Park / Busch Greenway',        startLat: 38.6946466,  startLng: -90.6843187, endName: 'Lewis & Clark Trailhead',                          endLat: 38.69111,    endLng: -90.72442,    miles: 4.72 },
  { legNumber: 6,  startName: 'Lewis & Clark Trailhead',                  startLat: 38.69111,    startLng: -90.72442,   endName: 'Weldon Spring Trailhead',                          endLat: 38.659962,   endLng: -90.743787,   miles: 5.89 },
  { legNumber: 7,  startName: 'Weldon Spring Trailhead',                  startLat: 38.659962,   startLng: -90.743787,  endName: 'Weldon Spring Conservation Area (Lost Valley)',    endLat: 38.6614265,  endLng: -90.75767,    miles: 5.73 },
  { legNumber: 8,  startName: 'Weldon Spring Conservation Area (Lost Valley)', startLat: 38.6614265, startLng: -90.75767, endName: 'Matson',                                         endLat: 38.608612,   endLng: -90.79485,    miles: 4.43 },
  { legNumber: 9,  startName: 'Matson',                                   startLat: 38.608612,   startLng: -90.79485,   endName: 'Klondike Park',                                    endLat: 38.58024,    endLng: -90.83944,    miles: 3.61 },
  { legNumber: 10, startName: 'Klondike Park',                            startLat: 38.58024,    startLng: -90.83944,   endName: 'Augusta',                                          endLat: 38.569882,   endLng: -90.881067,   miles: 2.58 },
  { legNumber: 11, startName: 'Augusta',                                  startLat: 38.569882,   startLng: -90.881067,  endName: 'Dutzow',                                           endLat: 38.602628,   endLng: -90.999058,   miles: 7.56 },
  { legNumber: 12, startName: 'Dutzow',                                   startLat: 38.602628,   startLng: -90.999058,  endName: 'Marthasville',                                     endLat: 38.627633,   endLng: -91.060658,   miles: 3.67 },
  { legNumber: 13, startName: 'Marthasville',                             startLat: 38.627633,   startLng: -91.060658,  endName: 'Treloar',                                          endLat: 38.643583,   endLng: -91.188267,   miles: 6.96 },
  { legNumber: 14, startName: 'Treloar',                                  startLat: 38.643583,   startLng: -91.188267,  endName: 'Bernheimer Road',                                  endLat: 38.66808,    endLng: -91.25537,    miles: 4.17 },
  { legNumber: 15, startName: 'Bernheimer Road',                          startLat: 38.66808,    startLng: -91.25537,   endName: 'Gore-Case Community Center',                       endLat: 38.72521,    endLng: -91.34014,    miles: 6.14 },
  { legNumber: 16, startName: 'Gore-Case Community Center',               startLat: 38.72521,    startLng: -91.34014,   endName: 'Case Road',                                        endLat: 38.73476,    endLng: -91.37289,    miles: 2.69 },
  { legNumber: 17, startName: 'Case Road',                                startLat: 38.73476,    startLng: -91.37289,   endName: 'McKittrick',                                       endLat: 38.73410,    endLng: -91.44449,    miles: 3.89 },
  { legNumber: 18, startName: 'McKittrick',                               startLat: 38.73410,    startLng: -91.44449,   endName: 'Hermann & Finish!!',                               endLat: 38.70396,    endLng: -91.43376,    miles: 3.15 },
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
