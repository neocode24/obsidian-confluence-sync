import { ConfluenceClient } from '../api/ConfluenceClient';
import { SyncHistory } from './SyncHistory';
import { CQLBuilder } from '../utils/CQLBuilder';
import { SyncFilters } from '../types/filters';

/**
 * 백그라운드 변경 감지기
 * Confluence 페이지 변경사항을 백그라운드에서 감지
 */
export class BackgroundChangeDetector {
  constructor(
    private confluenceClient: ConfluenceClient,
    private syncHistory: SyncHistory,
    private filters?: SyncFilters
  ) {}

  /**
   * Confluence 변경사항 체크
   * @returns 변경된 페이지 개수
   */
  async checkForChanges(): Promise<number> {
    try {
      // 1. Confluence 연결 확인
      if (!this.confluenceClient.isConnected()) {
        console.log('[BackgroundChangeDetector] Not connected, skipping check');
        return 0;
      }

      // 2. CQL 쿼리 생성
      const cqlBuilder = new CQLBuilder();
      const cqlQuery = cqlBuilder.buildSearchQuery(this.filters);

      // 3. Confluence 페이지 목록 조회 (lastModified만 필요)
      const pages = await this.confluenceClient.searchPages(cqlQuery, 100);

      if (pages.length === 0) {
        console.log('[BackgroundChangeDetector] No pages found');
        return 0;
      }

      // 4. SyncHistory 로드
      await this.syncHistory.loadHistory();

      // 5. 변경된 페이지 카운트
      let changedCount = 0;

      for (const page of pages) {
        const record = this.syncHistory.getRecord(page.id);

        if (!record) {
          // 새 페이지
          changedCount++;
        } else {
          // 기존 페이지 - lastModified 비교
          const confluenceModified = new Date(page.lastModified).getTime();
          const localModified = new Date(record.lastModified).getTime();

          if (confluenceModified > localModified) {
            changedCount++;
          }
        }
      }

      console.log(`[BackgroundChangeDetector] Found ${changedCount} changed pages out of ${pages.length}`);
      return changedCount;

    } catch (error) {
      // 네트워크 오류 등은 조용히 실패 (사용자 방해 금지)
      console.log('[BackgroundChangeDetector] Check failed (silently):', error);
      return 0;
    }
  }
}
