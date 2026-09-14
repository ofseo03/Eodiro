# SQLite 전체 콘텐츠 인덱스

모든 목록 ID를 한 행씩 저장합니다. 사전 허용 ID 목록, 추천 여부, 추천 조합은 저장하지 않습니다. 미분류·좌표 없음·서비스 지역 밖·종료 행사·상세 조회 실패도 삭제하지 않습니다.

## 파일과 테이블

배포 파일은 `data/places.sqlite`이며 런타임에는 읽기 전용입니다.

```sql
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  region_id TEXT,
  payload TEXT NOT NULL
);
CREATE INDEX places_region ON places(region_id);
```

`id`는 비짓서울 콘텐츠면 `VisitSeoul:콘텐츠CID`, 수동 추가 장소면 `manual:원하는-식별자` 형식입니다. `region_id`는 아래 `payload.regionId`와 같아야 합니다. 매핑되지 않으면 SQL `NULL`입니다. `payload`는 다음 JSON 객체를 UTF-8 TEXT로 저장합니다. 실제 검증 기준은 `lib/contracts.ts`의 `placeIndexSchema`입니다.

| payload 필드 | 값 / 의미 |
|---|---|
| `id` | `VisitSeoul:KOP…` 형식의 원본 ID |
| `name` | 콘텐츠 제목 |
| `regionId` | `config/regions.json`의 지역 ID. 미확인·서비스 밖은 `null` |
| `district`, `dong` | 좌표로 확인한 구·행정동. 미확인은 `""` |
| `lat`, `lng` | 숫자 위도·경도. 미확인은 `null`; 서비스 밖 좌표도 보존 |
| `sourceCategory` | API `cate_depth` 원문 |
| `category` | `cafe`, `restaurant`, `activity` 또는 `null` |
| `food` | `한식`, `양식`, `일식`, `중식`, `아시안`, `카페 디저트`, `기타` 또는 `null` |
| `activity` | `전시`, `체험`, `쇼핑`, `공원`, `공연`, `기타` 또는 `null` |
| `environment` | `indoor`, `outdoor`, `mixed`, `unknown` |
| `environmentSource` | `source`(원문 명시), `inferred`(분류에서 추론), `reviewed`(확인된 정보) |
| `atmospheres` | `조용함`, `활기참`, `감성`, `힙플`의 배열. 없으면 `[]` |
| `hours` | 아래 요일·날짜별 영업시간 객체. 미확인은 `null` |
| `hoursText` | API `extra.cmmn_use_time` 원문 |
| `businessDaysText` | API `extra.business_days` 원문 |
| `closedDaysText` | API `extra.closed_days` 원문 |
| `availableFrom`, `availableUntil` | 행사 시작·종료일 `YYYY-MM-DD`, 해당 날짜 포함. 미확인은 `null` |
| `detailStatus` | `pending`(미수집), `ok`(상세 수집 성공), `failed`(조회·형식 실패). 추천 여부가 아님 |
| `source`, `sourceUrl` | 출처 이름과 공개 콘텐츠 URL |
| `collectedAt` | 해당 인덱스 행 작성 시각, 시간대가 있는 ISO 문자열 |
| `address`, `description` | **수동 추가 장소에만** 저장. 비짓서울 콘텐츠는 저장 시 빈 문자열로 지워집니다 |

비짓서울 콘텐츠의 설명·주소 본문과 API 키는 저장하지 않습니다. 설명·주소는 추천 ID가 결정된 후 상세 API로 조회합니다. 수동 추가 장소는 상세 API가 없으므로 인덱스의 `address`·`description`을 그대로 결과 화면에 씁니다. **영업시간·휴무·행사 기간은 추천 전에 필요하므로 인덱스에 보존합니다.**

## 영업시간 형식

```json
{
  "weekly": {"0": [[600, 1200]], "1": [], "2": [[600, 1200]]},
  "exceptions": {"2026-09-28": [], "2026-09-29": [[780, 1080]]}
}
```

요일은 `0` 일요일부터 `6` 토요일입니다. 시간은 자정 이후 분이며 `[시작, 종료)`입니다. 자정을 넘으면 종료를 1440보다 크게 씁니다. 예: 22시~다음 날 02시는 `[1320,1560]`.

`[]`는 확인된 휴무, 키 생략은 미확인입니다. 날짜 예외는 해당 날짜 전체에 우선합니다. 단순 시간대·요일·명시된 휴무 날짜는 수집기가 변환합니다. “명절 휴무”, “계절별 상이” 등 해석이 필요한 문장은 원문으로 남기며, 확인되지 않은 날짜를 휴무나 영업으로 만들어 넣지 않습니다. 다른 컴퓨터에서 확인한 구조화된 정보는 `hours`에 직접 넣을 수 있습니다.

## 검색 시 적용

1. 전체 인덱스에서 선택 지역과 확인된 좌표·카테고리가 있는 행을 읽습니다. 미확인 행은 DB에 그대로 남습니다.
2. 카페·식당·놀거리 개수와 실내외 조건을 적용하고, 이동 경로를 조합합니다. 명시한 실내·실외 조건에 `unknown`은 일치하지 않으며 `mixed`는 양쪽에 포함합니다.
3. 각 장소의 실제 도착 시각에 영업시간·휴무·행사 기간을 검사합니다. 미확인 영업시간은 기존 `hours_unknown` 상태로 표시하며, 확인된 휴무는 제외합니다. 장소 교체에도 같은 검사를 적용합니다.
4. 선택된 ID만 상세 API로 보완합니다. 교체 시에는 새 ID만 조회합니다.

카테고리 매핑은 모든 ID에 동일하게 적용됩니다. API 음식 분류 중 카페/찻집은 카페, 다른 음식 분류는 식당, 문화·자연·역사·쇼핑·체험·축제/공연/행사는 놀거리입니다. 숙박 등 세 범주 밖이거나 분류를 알 수 없는 콘텐츠는 `category: null`로 보존합니다. 실내외 추론은 `environmentSource: inferred`로 구분합니다.

## 부족한 동네에 장소 추가하기

홈에서 회색으로 표시되는 동네는 카페·식당·놀거리 중 하나라도 0개인 곳입니다. 기존 인덱스를 지우지 않고 장소만 보태려면:

```bash
npm run add:places -- 추가-장소.json            # 같은 ID가 있으면 덮어씀
npm run add:places -- 추가-장소.json --strict   # 같은 ID가 있으면 아무것도 저장하지 않음
```

- 형식은 [`manual-places.example.json`](manual-places.example.json)과 같은 JSON 배열입니다. `id`, `name`, `regionId`, `district`, `dong`, `category`, `lat`, `lng`, `source`, `sourceUrl`, `collectedAt`은 필수이고 나머지는 생략하면 "미확인"으로 저장됩니다.
- `id`는 `manual:`로 시작하는 고유 문자열을 씁니다. 비짓서울 ID와 겹치지 않게 하고, 한 번 정한 ID는 바꾸지 않아야 덮어쓰기가 됩니다.
- `lat`·`lng`는 해당 동네 행정동 경계 안에 있어야 하며, `district`·`dong`은 `config/regions.json`의 값과 정확히 같아야 합니다. 벗어나면 어느 항목이 문제인지 출력하고 아무것도 저장하지 않습니다.
- 수동 장소는 `address`·`description`이 결과 화면에 그대로 나오므로 채워 두는 것이 좋습니다. `environmentSource`는 직접 확인했으면 `reviewed`로 둡니다.
- 저장 후 해당 동네의 카테고리별 개수와 아직 부족한 카테고리를 출력합니다. 세 카테고리가 모두 1개 이상이면 홈에서 선택할 수 있게 됩니다.
- 갱신된 `data/places.sqlite`를 커밋해야 배포에 반영됩니다.

어느 동네가 얼마나 부족한지는 `npm run gen:missing`으로 뽑습니다. [`missing-places.md`](missing-places.md)에 구별 목록을, [`manual-places.todo.json`](manual-places.todo.json)에 부족한 칸마다 한 건씩 자리를 잡아 둔 템플릿을 씁니다. 템플릿 항목은 이름이 `(작성 필요)`로 시작하고 좌표는 행정동 중심 자리표시자이므로, 실제 장소로 바꾼 항목만 남기고 `add:places`를 실행합니다. `(작성 필요)`가 남은 항목이 하나라도 있으면 아무것도 저장하지 않습니다.

## 다른 컴퓨터에서 파일 만들기

JSON 인덱스 배열을 준비했다면:

```bash
TSX_DISABLE_CACHE=1 npm run import:places -- 전체-ID-인덱스.json
```

기존 캐시가 목록 JSON 배열(`cid`, `post_sj`, `lang_code_id`, `cate_depth`)과 `CID.json` 상세 객체 파일들이라면, API 호출 없이 같은 규칙으로 변환할 수 있습니다:

```bash
TSX_DISABLE_CACHE=1 npm run index:cached -- data/raw/snapshot-list.json data/raw/snapshot-details
```

두 명령 모두 `PLACE_DB_PATH`가 있으면 그 경로, 없으면 `data/places.sqlite`에 저장합니다. 입력 형식 검증 후 트랜잭션으로 교체하며, 중복 ID는 오류로 처리합니다. 이 명령은 인덱스 작성용이며 배포 후 요청 처리에서는 실행하지 않습니다.

완료 여부는 **전체 목록 ID 수 = 저장 행 수**와 `detailStatus`별 건수를 따로 확인합니다. 추천 가능한 지역·카테고리·좌표가 확인된 수가 전체 행 수보다 작아도 ID가 삭제된 것은 아닙니다.
