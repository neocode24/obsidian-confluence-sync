import { App, Notice } from 'obsidian';
import { ConfluenceClient } from '../api/ConfluenceClient';
import { MarkdownConverter } from '../converters/MarkdownConverter';
import { MetadataBuilder } from '../converters/MetadataBuilder';
import { FileManager } from '../utils/FileManager';
import { generateSlug } from '../utils/slug';
import { ConfluencePage } from '../types/confluence';
import { SyncHistory, SyncHistoryRecord } from './SyncHistory';
import { ChangeDetector } from './ChangeDetector';
import { Logger, LogLevel } from '../utils/Logger';

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  totalPages: number;
  updatedPages: number;
  skippedPages: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ pageId: string; pageTitle: string; error: string }>;
}

/**
 * Confluence → Obsidian 동기화 엔진
 */
export class SyncEngine {
  private markdownConverter: MarkdownConverter;
  private metadataBuilder: MetadataBuilder;
  private syncHistory: SyncHistory;
  private changeDetector: ChangeDetector;
  private logger: Logger;

  constructor(
    private app: App,
    private confluenceClient: ConfluenceClient,
    private fileManager: FileManager,
    private syncPath: string,
    private forceSync: boolean = false,
    private cqlQuery: string = 'type = page',
    logLevel: LogLevel = 'INFO'
  ) {
    this.markdownConverter = new MarkdownConverter();
    this.metadataBuilder = new MetadataBuilder();
    this.syncHistory = new SyncHistory(app);
    this.changeDetector = new ChangeDetector(this.syncHistory, forceSync);
    this.logger = new Logger('SyncEngine', logLevel);
  }

  /**
   * 모든 Confluence 페이지 동기화
   */
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      totalPages: 0,
      updatedPages: 0,
      skippedPages: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    try {
      this.logger.info('Starting sync operation', { cqlQuery: this.cqlQuery, forceSync: this.forceSync });
      new Notice('🔄 Confluence 동기화 시작...');

      // 1. 동기화 이력 로드
      await this.syncHistory.loadHistory();
      this.logger.debug('Sync history loaded');

      // 2. Confluence 페이지 조회 (CQL 쿼리 적용)
      const allPages = await this.confluenceClient.searchPages(this.cqlQuery);
      result.totalPages = allPages.length;
      this.logger.info('Pages fetched from Confluence', { totalPages: allPages.length });

      if (allPages.length === 0) {
        this.logger.info('No pages to sync');
        new Notice('ℹ️ 동기화할 페이지가 없습니다.');
        return result;
      }

      new Notice(`📄 ${allPages.length}개 페이지 발견. 변경 감지 중...`);

      // 3. 변경된 페이지만 필터링
      const pagesToSync = await this.changeDetector.filterChangedPages(allPages);
      result.updatedPages = pagesToSync.length;
      result.skippedPages = allPages.length - pagesToSync.length;
      this.logger.info('Change detection completed', {
        toSync: pagesToSync.length,
        skipped: result.skippedPages
      });

      if (pagesToSync.length === 0) {
        this.logger.info('All pages are up to date');
        new Notice('ℹ️ 업데이트할 페이지가 없습니다. 모두 최신 상태입니다.');
        result.success = true;
        return result;
      }

      new Notice(`🔄 ${pagesToSync.length}개 페이지 동기화 중 (${result.skippedPages}개 스킵)...`);

      // 4. 각 페이지 동기화
      for (const page of pagesToSync) {
        try {
          this.logger.debug('Syncing page', { pageId: page.id, title: page.title });
          const filePath = await this.syncPage(page);
          result.successCount++;

          // 5. 동기화 이력 업데이트
          const record: SyncHistoryRecord = {
            pageId: page.id,
            lastSyncedAt: new Date().toISOString(),
            lastModified: page.lastModified,
            filePath: filePath,
          };
          this.syncHistory.updateRecord(page.id, record);
        } catch (error) {
          result.failureCount++;
          result.errors.push({
            pageId: page.id,
            pageTitle: page.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.logger.error('Failed to sync page', { pageId: page.id, title: page.title, error });
        }
      }

      // 6. 동기화 이력 저장
      await this.syncHistory.saveHistory();
      this.logger.debug('Sync history saved');

      // 7. 결과 표시
      if (result.failureCount === 0) {
        this.logger.info('Sync completed successfully', { successCount: result.successCount, skipped: result.skippedPages });
        new Notice(
          `✓ ${result.successCount}개 페이지 동기화 완료! (${result.skippedPages}개 스킵)`
        );
      } else {
        this.logger.warn('Sync completed with errors', {
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors
        });
        new Notice(
          `⚠️ 동기화 완료: 성공 ${result.successCount}개, 실패 ${result.failureCount}개, 스킵 ${result.skippedPages}개`
        );
      }

      result.success = result.failureCount === 0;
      return result;
    } catch (error) {
      this.logger.error('Sync operation failed', error);
      new Notice(`❌ 동기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }

  /**
   * 단일 페이지 동기화
   * @returns 저장된 파일 경로
   */
  private async syncPage(page: ConfluencePage): Promise<string> {
    // 1. Markdown 변환
    const markdown = await this.markdownConverter.convertPage(page);

    // 2. YAML Frontmatter 생성
    const frontmatter = this.metadataBuilder.buildFrontmatter(page);

    // 3. 콘텐츠 결합
    const content = this.metadataBuilder.combineContent(frontmatter, markdown);

    // 4. 파일명 생성
    const slug = generateSlug(page.title);
    const fileName = await this.fileManager.ensureUniqueFileName(slug, this.syncPath);

    // 5. 파일 저장
    const filePath = `${this.syncPath}${fileName}`;
    await this.fileManager.writeFile(filePath, content);

    return filePath;
  }

  /**
   * 강제 동기화 옵션 설정
   */
  setForceSync(force: boolean): void {
    this.forceSync = force;
    this.changeDetector.setForceSync(force);
  }
}
