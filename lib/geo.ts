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

export type PolygonCoordinates = number[][][];
export function polygonContains(point: {lat: number; lng: number}, rings: PolygonCoordinates) {
  const inRing = (ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i], [px, py] = ring[j];
      const cross = (point.lng - x) * (py - y) - (point.lat - y) * (px - x);
      if (Math.abs(cross) < 1e-12 && point.lng >= Math.min(x, px) && point.lng <= Math.max(x, px)
        && point.lat >= Math.min(y, py) && point.lat <= Math.max(y, py)) return true;
      if ((y > point.lat) !== (py > point.lat) && point.lng < (px - x) * (point.lat - y) / (py - y) + x) inside = !inside;
    }
    return inside;
  };
  return inRing(rings[0]) && !rings.slice(1).some(inRing);
}

export function polygonCenter(polygons: PolygonCoordinates[]) {
  let area = 0, xSum = 0, ySum = 0;
  for (const polygon of polygons) for (const [index, ring] of polygon.entries()) {
    let crossSum = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x, y] = [ring[i][0] - 127, ring[i][1] - 37.5];
      const [nx, ny] = [ring[i + 1][0] - 127, ring[i + 1][1] - 37.5];
      const cross = x * ny - nx * y;
      crossSum += cross; cx += (x + nx) * cross; cy += (y + ny) * cross;
    }
    if (!crossSum) continue;
    const weight = Math.abs(crossSum) * (index ? -1 : 1);
    area += weight; xSum += cx / (3 * crossSum) * weight; ySum += cy / (3 * crossSum) * weight;
  }
  if (area <= 0) throw new Error('행정동 경계 면적 오류');
  return { lng: xSum / area + 127, lat: ySum / area + 37.5 };
}
