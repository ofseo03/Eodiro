// 코스 구성·순서 규칙. 폼(lib/types.ts), 요청 스키마(lib/contracts.ts), 추천 탐색(lib/course.ts), 평가 API가 함께 쓴다.
export type CategoryKey = 'cafe' | 'restaurant' | 'activity';
export type Counts = Record<CategoryKey, number>;

export const MIN_PLACES = 2;
export const MAX_PLACES = 5;
/** 카테고리별 최대 개수. 놀거리는 총 장소 수 상한까지 허용한다. */
export const MAX_PER_CATEGORY: Counts = { cafe: 3, restaurant: 3, activity: MAX_PLACES };
/** 같은 카테고리를 연달아 방문할 수 없는 카테고리. 놀거리 → 놀거리는 허용한다. */
export const NO_CONSECUTIVE: readonly CategoryKey[] = ['cafe', 'restaurant'];

/** 은/는 조사. 마지막 글자가 받침이 있으면 '은'. */
const topic = (word: string) => {
  const code = word.charCodeAt(word.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0 ? `${word}은` : `${word}는`;
};

export const totalPlaces = (counts: Counts) => counts.cafe + counts.restaurant + counts.activity;

/** 앞 장소 다음에 이 카테고리를 방문할 수 있는지. */
export function canFollow(previous: CategoryKey | null, next: CategoryKey) {
  return previous === null || previous !== next || !NO_CONSECUTIVE.includes(next);
}

/**
 * 구성 자체가 규칙을 어기면 그 이유를, 아니면 null을 돌려준다.
 * 연속 금지 카테고리는 사이를 메울 다른 장소가 (개수 - 1)곳 이상 있어야 배열할 수 있다.
 */
export function compositionProblem(counts: Counts, label: Record<CategoryKey, string> = { cafe: '카페', restaurant: '식당', activity: '놀거리' }): string | null {
  const total = totalPlaces(counts);
  if (total < MIN_PLACES || total > MAX_PLACES) return `총 장소 수는 ${MIN_PLACES}곳 이상 ${MAX_PLACES}곳 이하여야 해요.`;
  for (const c of ['cafe', 'restaurant', 'activity'] as const) {
    if (counts[c] > MAX_PER_CATEGORY[c]) return `${topic(label[c])} 최대 ${MAX_PER_CATEGORY[c]}곳까지 넣을 수 있어요.`;
  }
  for (const c of NO_CONSECUTIVE) {
    if (counts[c] > total - counts[c] + 1) return `${topic(label[c])} 연달아 방문할 수 없어요. 사이에 넣을 다른 장소를 ${counts[c] - 1}곳 이상 더해 주세요.`;
  }
  return null;
}

/** 방문 순서가 연속 금지 규칙을 지키는지. */
export function orderAllowed(categories: readonly CategoryKey[]) {
  return categories.every((c, i) => canFollow(i ? categories[i - 1] : null, c));
}
