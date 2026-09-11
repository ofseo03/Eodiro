type Point = { getLat(): number; getLng(): number };
type Bounds = { extend(point: Point): void };
export type KakaoMap = { setBounds(bounds: Bounds): void; panTo(point: Point): void; relayout(): void };
export type KakaoMaps = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => Point;
  LatLngBounds: new () => Bounds;
  Map: new (element: HTMLElement, options: { center: Point; level: number }) => KakaoMap;
  CustomOverlay: new (options: { map: KakaoMap; position: Point; content: HTMLElement; yAnchor: number; clickable: boolean }) => { setMap(map: KakaoMap | null): void };
};

declare global { interface Window { kakao?: { maps: KakaoMaps } } }
let loading: Promise<KakaoMaps> | null = null;

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch('/api/map/config', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('지도 설정을 불러오지 못했어요.');
    const config = await response.json();
    const url = new URL(config.sdkUrl);
    if (url.origin !== 'https://dapi.kakao.com' || url.pathname !== '/v2/maps/sdk.js' || url.searchParams.get('autoload') !== 'false') {
      throw new Error('지도 설정을 확인하지 못했어요.');
    }
    return new Promise<KakaoMaps>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => fail(), 15000);
      function fail() {
        clearTimeout(timer); script.remove(); reject(new Error('지도를 불러오지 못했어요.'));
      }
      script.src = url.href;
      script.async = true;
      script.onerror = fail;
      script.onload = () => {
        try {
          if (!window.kakao?.maps) return fail();
          window.kakao.maps.load(() => { clearTimeout(timer); resolve(window.kakao!.maps); });
        } catch { fail(); }
      };
      document.head.append(script);
    });
  })().catch(error => { loading = null; throw error; });
  return loading;
}
