import { Notice } from 'obsidian';
import { ConfluenceClient } from '../api/ConfluenceClient';
import { MarkdownConverter } from '../converters/MarkdownConverter';
import { MetadataBuilder } from '../converters/MetadataBuilder';
import { FileManager } from '../utils/FileManager';
import { generateSlug } from '../utils/slug';
import { ConfluencePage } from '../types/confluence';

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  totalPages: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ pageId: string; pageTitle: string; error: string }>;
}

/**
 * 동기화 이력 레코드
 */
export interface SyncRecord {
  pageId: string;
  lastSyncTime: string;
  lastModified: string;
  fileName: string;
  filePath: string;
}

/**
 * 동기화 이력
 */
export interface SyncHistory {
  [pageId: string]: SyncRecord;
}

/**
 * Confluence → Obsidian 동기화 엔진
 */
export class SyncEngine {
  private markdownConverter: MarkdownConverter;
  private metadataBuilder: MetadataBuilder;

  constructor(
    private confluenceClient: ConfluenceClient,
    private fileManager: FileManager,
    private syncPath: string
  ) {
    this.markdownConverter = new MarkdownConverter();
    this.metadataBuilder = new MetadataBuilder();
  }

  /**
   * 모든 Confluence 페이지 동기화
   */
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      totalPages: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    try {
      new Notice('🔄 Confluence 동기화 시작...');

      // 1. Confluence 페이지 조회
      const pages = await this.confluenceClient.searchPages();
      result.totalPages = pages.length;

      if (pages.length === 0) {
        new Notice('ℹ️ 동기화할 페이지가 없습니다.');
        return result;
      }

      new Notice(`📄 ${pages.length}개 페이지 발견. 동기화 중...`);

      // 2. 각 페이지 동기화
      for (const page of pages) {
        try {
          await this.syncPage(page);
          result.successCount++;
        } catch (error) {
          result.failureCount++;
          result.errors.push({
            pageId: page.id,
            pageTitle: page.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`[SyncEngine] Failed to sync page ${page.id}:`, error);
        }
      }

      // 3. 결과 표시
      if (result.failureCount === 0) {
        new Notice(`✓ ${result.successCount}개 페이지 동기화 완료!`);
      } else {
        new Notice(
          `⚠️ 동기화 완료: 성공 ${result.successCount}개, 실패 ${result.failureCount}개`
        );
      }

      result.success = result.failureCount === 0;
      return result;
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      new Notice(`❌ 동기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }

  /**
   * 단일 페이지 동기화
   */
  private async syncPage(page: ConfluencePage): Promise<void> {
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

    // 6. 동기화 이력 저장 (현재는 생략 - Story 후속 작업)
    // TODO: Save sync history to .obsidian/plugins/confluence-sync/sync-history.json
  }

  /**
   * 동기화 이력 로드 (미구현 - Future Story)
   */
  async loadSyncHistory(): Promise<SyncHistory> {
    // TODO: Load from .obsidian/plugins/confluence-sync/sync-history.json
    return {};
  }

  /**
   * 동기화 이력 저장 (미구현 - Future Story)
   */
  async saveSyncHistory(history: SyncHistory): Promise<void> {
    // TODO: Save to .obsidian/plugins/confluence-sync/sync-history.json
  }
}
