import { SyncFilters } from '../types/filters';

/**
 * CQL (Confluence Query Language) 쿼리 빌더
 * 사용자 필터 설정을 CQL 쿼리로 변환
 */
export class CQLBuilder {
  /**
   * 필터 설정을 기반으로 CQL 검색 쿼리 생성
   * @param filters 동기화 필터 설정
   * @returns CQL 쿼리 문자열
   */
  buildSearchQuery(filters?: SyncFilters): string {
    const conditions: string[] = [];

    // 기본 조건: 페이지 타입만 검색
    conditions.push('type = page');

    // 필터가 비활성화되었거나 없으면 기본 쿼리만 반환
    if (!filters || !filters.enabled) {
      return conditions.join(' AND ');
    }

    // Space 필터
    if (filters.spaceKeys && filters.spaceKeys.length > 0) {
      const validSpaceKeys = filters.spaceKeys
        .map(key => this.escapeValue(key))
        .filter(key => key.length > 0);

      if (validSpaceKeys.length > 0) {
        const spaceList = validSpaceKeys.join(', ');
        conditions.push(`space IN (${spaceList})`);
      }
    }

    // Label 필터
    if (filters.labels && filters.labels.length > 0) {
      const validLabels = filters.labels
        .map(label => this.escapeValue(label))
        .filter(label => label.length > 0);

      if (validLabels.length > 0) {
        const labelList = validLabels.join(', ');
        conditions.push(`label IN (${labelList})`);
      }
    }

    // Page Tree 필터 (ancestor)
    if (filters.rootPageIds && filters.rootPageIds.length > 0) {
      const validPageIds = filters.rootPageIds
        .filter(id => id.length > 0 && /^\d+$/.test(id)); // 숫자만 허용

      if (validPageIds.length > 0) {
        const pageIdList = validPageIds.join(', ');
        conditions.push(`ancestor IN (${pageIdList})`);
      }
    }

    return conditions.join(' AND ');
  }

  /**
   * CQL 값 이스케이프 처리
   * @param value 원본 값
   * @returns 이스케이프된 값
   */
  private escapeValue(value: string): string {
    if (!value || value.trim().length === 0) {
      return '';
    }

    const trimmed = value.trim();

    // 공백이나 특수문자가 포함된 경우 따옴표로 감싸기
    if (/[\s,()]/.test(trimmed)) {
      // 내부 따옴표 이스케이프
      const escaped = trimmed.replace(/"/g, '\\"');
      return `"${escaped}"`;
    }

    return trimmed;
  }

  /**
   * 필터 유효성 검증
   * @param filters 동기화 필터 설정
   * @returns true if valid
   */
  validateFilters(filters: SyncFilters): boolean {
    // enabled가 false면 항상 유효
    if (!filters.enabled) {
      return true;
    }

    // 모든 필터가 비어있으면 유효하지 않음 (필터 활성화 상태에서)
    const hasSpaceFilter = filters.spaceKeys && filters.spaceKeys.length > 0;
    const hasLabelFilter = filters.labels && filters.labels.length > 0;
    const hasPageTreeFilter = filters.rootPageIds && filters.rootPageIds.length > 0;

    // 최소 하나의 필터는 있어야 함
    if (filters.enabled && !hasSpaceFilter && !hasLabelFilter && !hasPageTreeFilter) {
      return false;
    }

    // Page ID 검증 (숫자만 허용)
    if (hasPageTreeFilter) {
      const invalidPageIds = filters.rootPageIds!.filter(id => id.length > 0 && !/^\d+$/.test(id));
      if (invalidPageIds.length > 0) {
        console.warn(`[CQLBuilder] Invalid page IDs detected: ${invalidPageIds.join(', ')}`);
        return false;
      }
    }

    return true;
  }
}
