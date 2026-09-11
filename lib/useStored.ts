"use client";

import { useSyncExternalStore } from "react";
import { subscribeStorage } from "./storage";

const noop = () => () => {};

/**
 * 기기 저장소 값을 구독한다. 서버·하이드레이션 렌더에서는 serverValue 를 쓰고,
 * 클라이언트에서 저장소가 바뀌면(쓰기·다른 탭) 다시 렌더한다.
 * read 는 같은 값이면 같은 참조를 돌려줘야 한다(lib/storage.ts 의 read 캐시).
 */
export function useStored<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribeStorage, read, () => serverValue);
}

/** 하이드레이션이 끝났는지. 서버 스냅숏은 false, 클라이언트는 true. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
