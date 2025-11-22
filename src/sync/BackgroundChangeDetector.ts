import { ConfluenceClient } from '../api/ConfluenceClient';
import { SyncHistory } from './SyncHistory';
import { CQLBuilder } from '../utils/CQLBuilder';
import { SyncFilters } from '../types/filters';
import { Logger, LogLevel } from '../utils/Logger';

/**
 * 백그라운드 변경 감지기
 * Confluence 페이지 변경사항을 백그라운드에서 감지
 */
export class BackgroundChangeDetector {
  private logger: Logger;

  constructor(
    private confluenceClient: ConfluenceClient,
    private syncHistory: SyncHistory,
    private filters?: SyncFilters,
    logLevel: LogLevel = 'INFO'
  ) {
    this.logger = new Logger('BackgroundChangeDetector', logLevel);
  }

  /**
   * Confluence 변경사항 체크
   * @returns 변경된 페이지 개수
   */
  async checkForChanges(): Promise<number> {
    try {
      this.logger.debug('Starting background change check');

      // 1. Confluence 연결 확인
      if (!this.confluenceClient.isConnected()) {
        this.logger.debug('Not connected, skipping check');
        return 0;
      }

      // 2. CQL 쿼리 생성
      const cqlBuilder = new CQLBuilder();
      const cqlQuery = cqlBuilder.buildSearchQuery(this.filters);
      this.logger.debug('CQL query built', { cqlQuery });

      // 3. Confluence 페이지 목록 조회 (lastModified만 필요)
      const pages = await this.confluenceClient.searchPages(cqlQuery, 100);

      if (pages.length === 0) {
        this.logger.debug('No pages found');
        return 0;
      }

      this.logger.debug('Pages fetched', { count: pages.length });

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

      this.logger.info('Background check completed', {
        totalPages: pages.length,
        changedCount
      });
      return changedCount;

    } catch (error) {
      // 네트워크 오류 등은 조용히 실패 (사용자 방해 금지)
      this.logger.debug('Check failed (silently)', error);
      return 0;
    }
  }
}
