export function distanceMeters(a: {lat: number; lng: number}, b: {lat: number; lng: number}) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

// KMA DFS Lambert conformal conic conversion (5 km grid).
export function forecastGrid(lat: number, lng: number) {
  const rad = Math.PI / 180, re = 6371.00877 / 5;
  const slat1 = 30 * rad, slat2 = 60 * rad;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));
  const sf = Math.tan(Math.PI / 4 + slat1 / 2) ** sn * Math.cos(slat1) / sn;
  const ro = re * sf / Math.tan(Math.PI / 4 + 38 * rad / 2) ** sn;
  const ra = re * sf / Math.tan(Math.PI / 4 + lat * rad / 2) ** sn;
  const theta = (lng - 126) * rad * sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136.5) };
}
