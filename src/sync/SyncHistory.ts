import { App } from 'obsidian';

/**
 * 동기화 이력 레코드
 */
export interface SyncHistoryRecord {
  pageId: string;
  lastSyncedAt: string; // ISO 8601 format
  lastModified: string; // Confluence lastModified
  filePath: string; // Vault 내 상대 경로
}

/**
 * 동기화 이력 관리 (sync-history.json)
 */
export class SyncHistory {
  private history: Map<string, SyncHistoryRecord> = new Map();
  private historyFilePath: string;

  constructor(private app: App, private pluginId: string = 'confluence-sync') {
    // .obsidian/plugins/confluence-sync/sync-history.json
    this.historyFilePath = `.obsidian/plugins/${pluginId}/sync-history.json`;
  }

  /**
   * 이력 파일 로드
   */
  async loadHistory(): Promise<Map<string, SyncHistoryRecord>> {
    try {
      const adapter = this.app.vault.adapter;

      // 파일 존재 여부 확인
      const exists = await adapter.exists(this.historyFilePath);
      if (!exists) {
        console.log('[SyncHistory] No history file found, starting fresh');
        this.history = new Map();
        return this.history;
      }

      // 파일 읽기
      const content = await adapter.read(this.historyFilePath);
      const data = JSON.parse(content);

      // Map으로 변환
      this.history = new Map(Object.entries(data));
      console.log(`[SyncHistory] Loaded ${this.history.size} records`);

      return this.history;
    } catch (error) {
      console.error('[SyncHistory] Failed to load history:', error);
      this.history = new Map();
      return this.history;
    }
  }

  /**
   * 이력 파일 저장
   */
  async saveHistory(records?: Map<string, SyncHistoryRecord>): Promise<void> {
    try {
      const adapter = this.app.vault.adapter;

      // records가 제공되면 현재 history를 교체
      if (records) {
        this.history = records;
      }

      // Map을 객체로 변환
      const data = Object.fromEntries(this.history);

      // JSON 직렬화
      const content = JSON.stringify(data, null, 2);

      // 디렉토리 확인 및 생성
      const dirPath = this.historyFilePath.substring(0, this.historyFilePath.lastIndexOf('/'));
      const dirExists = await adapter.exists(dirPath);
      if (!dirExists) {
        await adapter.mkdir(dirPath);
      }

      // 파일 저장
      await adapter.write(this.historyFilePath, content);
      console.log(`[SyncHistory] Saved ${this.history.size} records`);
    } catch (error) {
      console.error('[SyncHistory] Failed to save history:', error);
      throw new Error(`Failed to save sync history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 특정 페이지의 이력 레코드 조회
   */
  getRecord(pageId: string): SyncHistoryRecord | undefined {
    return this.history.get(pageId);
  }

  /**
   * 페이지 이력 레코드 업데이트
   */
  updateRecord(pageId: string, record: SyncHistoryRecord): void {
    this.history.set(pageId, record);
  }

  /**
   * 전체 이력 초기화
   */
  async clearHistory(): Promise<void> {
    this.history.clear();
    await this.saveHistory();
    console.log('[SyncHistory] History cleared');
  }

  /**
   * 현재 로드된 이력 반환
   */
  getAll(): Map<string, SyncHistoryRecord> {
    return this.history;
  }

  /**
   * 이력 레코드 개수
   */
  size(): number {
    return this.history.size;
  }
}
