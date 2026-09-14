import regions from '../config/regions.json';

export const districts = [...new Set(regions.map(region => region.district))].map(name => {
  const towns = regions.filter(region => region.district === name);
  return { id: name, name, district: name, regionIds: towns.map(town => town.id),
    dongs: towns.flatMap(town => town.dongs),
    lat: towns.reduce((sum, town) => sum + town.lat, 0) / towns.length,
    lng: towns.reduce((sum, town) => sum + town.lng, 0) / towns.length };
});

export function findDistrict(id: string | null | undefined) {
  return districts.find(district => district.id === id || district.regionIds.includes(id ?? ''));
}

export function matchesRegion(place: { regionId: string; district: string }, regionId: string) {
  return place.regionId === regionId || place.district === regionId;
}
