# 캐릭터 이미지

2026-09-14 사용자 요청으로 OpenAI imagegen에서 제작한 창작 일러스트 31개를 웹용 WebP로 변환했습니다. 실제 건축물의 정확한 재현이나 지역 공식 마스코트가 아닙니다. 외부 사진 및 공식 캐릭터 파일은 포함하지 않습니다.

| 파일 | 사용 위치 | 크기 |
| --- | --- | --- |
| `regions/feature-seongsu.webp` | 성수 · 서울숲 소개 카드 | 1280px 폭 |
| `regions/feature-seochon.webp` | 서촌 · 익선 소개 카드 | 1280px 폭 |
| `regions/feature-hongdae.webp` | 홍대 · 연남 소개 카드 | 1280px 폭 |
| `regions/*.webp` (위 3개 제외, 25개) | 자치구 선택 카드 | 512 × 512 |
| `categories/restaurant.webp` | 식당 구성 및 코스 장소 카드 | 256 × 256 |
| `categories/cafe.webp` | 카페 구성 및 코스 장소 카드 | 256 × 256 |
| `categories/activities.webp` | 놀거리 구성 및 코스 장소 카드 | 256 × 256 |

지역과 파일의 연결은 `lib/images.ts`의 `DISTRICT_IMAGES`에 정의합니다. 검색 순서와 관계없이 자치구 ID로 이미지를 찾습니다. 지역 소개 카드의 어두운 하단은 흰색 제목을 위한 영역입니다. 카드의 둥근 모서리는 CSS로 적용합니다.

기존 히어로 슬롯 `hero.jpg`는 이번 이미지 세트에 포함되지 않으며, 파일이 없으면 기존 그라디언트를 표시합니다.

## 지역 소재 참고 자료

다음 자료는 지역 소재 조사에 사용했으며, 자료의 사진을 가져온 것은 아닙니다.

- [서울에디션25](https://scpm.seoul.go.kr/seoul-policy/evt0296): 서울 자치구별 문화·관광 소재
- [경복궁](https://royal.khs.go.kr/ROYAL/contents/R101010000.do), [DDP](https://www.ddp.or.kr/), [서대문구 문화관광](https://www.sdm.go.kr/culture/index.do)
- [중랑장미공원](https://news.seoul.go.kr/culture/archives/528363), [서서울호수공원](https://parks.seoul.go.kr/maps/lake/lakepark_map_KR.pdf)
- [금천구 가산 패션단지](https://www.geumcheon.go.kr/portal/contents.do?key=914), [강남구 봉은사](https://www.gangnam.go.kr/board/cardnews/86/view.do?mid=fm0306)
- [익선동 한옥마을](https://hanok.seoul.go.kr/front/kor/town/town09.do), [서촌거리](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=d29977f3-026f-42c6-985b-555c491ba70a), [경의선숲길](https://parks.seoul.go.kr/maps/gyeongui/gyeongui_map_KR.pdf)
