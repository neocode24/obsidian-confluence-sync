/**
 * 동기화 필터 설정
 */
export interface SyncFilters {
  /**
   * 필터 활성화 여부
   */
  enabled: boolean;

  /**
   * Space 키 목록 (빈 배열이면 모든 Space)
   */
  spaceKeys: string[];

  /**
   * 레이블 목록 (빈 배열이면 레이블 필터 없음)
   */
  labels: string[];

  /**
   * 페이지 트리 루트 페이지 ID 목록 (빈 배열이면 페이지 트리 필터 없음)
   */
  rootPageIds: string[];
}

/**
 * 기본 필터 설정
 */
export const DEFAULT_SYNC_FILTERS: SyncFilters = {
  enabled: false,
  spaceKeys: [],
  labels: [],
  rootPageIds: [],
};
