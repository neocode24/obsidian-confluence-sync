import { ConfluencePage } from '../types/confluence';
import { SyncHistoryRecord, SyncHistory } from './SyncHistory';

/**
 * Confluence 페이지 변경 감지
 */
export class ChangeDetector {
  constructor(
    private syncHistory: SyncHistory,
    private forceSync: boolean = false
  ) {}

  /**
   * 페이지가 업데이트 필요한지 확인
   * @param page Confluence 페이지
   * @param record 로컬 동기화 이력 레코드
   * @returns 업데이트 필요 여부
   */
  needsUpdate(page: ConfluencePage, record?: SyncHistoryRecord): boolean {
    // 강제 전체 동기화 옵션이 활성화된 경우
    if (this.forceSync) {
      console.log(`[ChangeDetector] Force sync enabled - updating page ${page.id}`);
      return true;
    }

    // 이력이 없으면 신규 페이지
    if (!record) {
      console.log(`[ChangeDetector] New page detected: ${page.id} (${page.title})`);
      return true;
    }

    // Confluence lastModified와 로컬 lastModified 비교
    const confluenceDate = new Date(page.lastModified);
    const localDate = new Date(record.lastModified);

    const hasChanged = confluenceDate > localDate;

    if (hasChanged) {
      console.log(`[ChangeDetector] Page changed: ${page.id} (${page.title})`);
      console.log(`  - Confluence: ${page.lastModified}`);
      console.log(`  - Local: ${record.lastModified}`);
    } else {
      console.log(`[ChangeDetector] No changes: ${page.id} (${page.title})`);
    }

    return hasChanged;
  }

  /**
   * 페이지 목록에서 변경된 페이지만 필터링
   * @param pages Confluence 페이지 목록
   * @returns 업데이트 필요한 페이지 목록
   */
  async filterChangedPages(pages: ConfluencePage[]): Promise<ConfluencePage[]> {
    const changedPages: ConfluencePage[] = [];

    for (const page of pages) {
      const record = this.syncHistory.getRecord(page.id);

      if (this.needsUpdate(page, record)) {
        changedPages.push(page);
      }
    }

    console.log(`[ChangeDetector] Filtered: ${changedPages.length}/${pages.length} pages need update`);

    return changedPages;
  }

  /**
   * 강제 동기화 옵션 설정
   */
  setForceSync(force: boolean): void {
    this.forceSync = force;
  }
}
