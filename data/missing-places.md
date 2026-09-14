# 장소가 부족한 동네

기준: `data/places.sqlite` (2026-09-14 생성, `npm run gen:missing`). 카페·식당·놀거리 중 하나라도 0개인 동네는 홈에서 회색으로 표시되고 선택할 수 없다.

- 전체 147곳 중 부족 0곳 (장소가 전혀 없는 곳 0곳)
- 채워야 할 칸: 0개 → 템플릿 [`manual-places.todo.json`](manual-places.todo.json)

채우는 방법: 템플릿에서 해당 항목의 `name`·`address`·`description`·`lat`·`lng`·`sourceUrl`을 실제 장소로 바꾸고(이름 앞 "(작성 필요)" 삭제), 채우지 않은 항목은 지운 뒤 `npm run add:places -- data/manual-places.todo.json` 을 실행한다. 템플릿 좌표는 행정동 중심의 자리표시자이므로 반드시 실제 좌표로 바꿔야 한다.
