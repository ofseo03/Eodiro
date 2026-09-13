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

`id`는 `VisitSeoul:콘텐츠CID`, `region_id`는 아래 `payload.regionId`와 같아야 합니다. 매핑되지 않으면 SQL `NULL`입니다. `payload`는 다음 JSON 객체를 UTF-8 TEXT로 저장합니다. 실제 검증 기준은 `lib/contracts.ts`의 `placeIndexSchema`입니다.

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

설명·주소 본문과 API 키는 저장하지 않습니다. 설명·주소는 추천 ID가 결정된 후 상세 API로 조회합니다. **영업시간·휴무·행사 기간은 추천 전에 필요하므로 인덱스에 보존합니다.**

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
