import boundaries from '../config/region-boundaries.json';
import { polygonContains } from './geo';

export function locateRegion(point: {lat: number; lng: number}) {
  return boundaries.features.find(feature => polygonContains(point, feature.geometry.coordinates))?.properties ?? null;
}
