import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncHistory, SyncHistoryRecord } from '../../../src/sync/SyncHistory';

// Mock Obsidian App
const mockApp = {
  vault: {
    adapter: {
      exists: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
      mkdir: vi.fn(),
    }
  }
} as any;

describe('SyncHistory', () => {
  let syncHistory: SyncHistory;

  beforeEach(() => {
    vi.clearAllMocks();
    syncHistory = new SyncHistory(mockApp, 'test-plugin');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadHistory', () => {
    it('should return empty map if history file does not exist', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(false);

      const history = await syncHistory.loadHistory();

      expect(history.size).toBe(0);
      expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('.obsidian/plugins/test-plugin/sync-history.json');
    });

    it('should load history from file', async () => {
      const historyData = {
        '12345': {
          pageId: '12345',
          lastSyncedAt: '2025-11-22T10:00:00Z',
          lastModified: '2025-11-22T09:30:00Z',
          filePath: 'confluence/test.md'
        },
        '67890': {
          pageId: '67890',
          lastSyncedAt: '2025-11-22T10:05:00Z',
          lastModified: '2025-11-22T09:45:00Z',
          filePath: 'confluence/another.md'
        }
      };

      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.read.mockResolvedValue(JSON.stringify(historyData));

      const history = await syncHistory.loadHistory();

      expect(history.size).toBe(2);
      expect(history.get('12345')).toEqual(historyData['12345']);
      expect(history.get('67890')).toEqual(historyData['67890']);
    });

    it('should handle corrupted history file', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.read.mockResolvedValue('invalid json');

      const history = await syncHistory.loadHistory();

      expect(history.size).toBe(0);
    });
  });

  describe('saveHistory', () => {
    it('should save history to file', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.write.mockResolvedValue(undefined);

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      };

      syncHistory.updateRecord('12345', record);
      await syncHistory.saveHistory();

      expect(mockApp.vault.adapter.write).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockApp.vault.adapter.write.mock.calls[0];

      expect(filePath).toBe('.obsidian/plugins/test-plugin/sync-history.json');

      const savedData = JSON.parse(content);
      expect(savedData['12345']).toEqual(record);
    });

    it('should create directory if it does not exist', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(false);
      mockApp.vault.adapter.mkdir.mockResolvedValue(undefined);
      mockApp.vault.adapter.write.mockResolvedValue(undefined);

      await syncHistory.saveHistory();

      expect(mockApp.vault.adapter.mkdir).toHaveBeenCalledWith('.obsidian/plugins/test-plugin');
    });

    it('should accept custom records map', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.write.mockResolvedValue(undefined);

      const customRecords = new Map<string, SyncHistoryRecord>();
      customRecords.set('99999', {
        pageId: '99999',
        lastSyncedAt: '2025-11-22T11:00:00Z',
        lastModified: '2025-11-22T10:30:00Z',
        filePath: 'confluence/custom.md'
      });

      await syncHistory.saveHistory(customRecords);

      const [, content] = mockApp.vault.adapter.write.mock.calls[0];
      const savedData = JSON.parse(content);

      expect(savedData['99999']).toBeDefined();
      expect(syncHistory.getRecord('99999')).toBeDefined();
    });
  });

  describe('getRecord', () => {
    it('should return record by page ID', async () => {
      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      };

      syncHistory.updateRecord('12345', record);

      expect(syncHistory.getRecord('12345')).toEqual(record);
    });

    it('should return undefined for non-existent page ID', () => {
      expect(syncHistory.getRecord('non-existent')).toBeUndefined();
    });
  });

  describe('updateRecord', () => {
    it('should add new record', () => {
      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      };

      syncHistory.updateRecord('12345', record);

      expect(syncHistory.size()).toBe(1);
      expect(syncHistory.getRecord('12345')).toEqual(record);
    });

    it('should update existing record', () => {
      const record1: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      };

      const record2: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T11:00:00Z',
        lastModified: '2025-11-22T10:30:00Z',
        filePath: 'confluence/test.md'
      };

      syncHistory.updateRecord('12345', record1);
      syncHistory.updateRecord('12345', record2);

      expect(syncHistory.size()).toBe(1);
      expect(syncHistory.getRecord('12345')).toEqual(record2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all records', async () => {
      mockApp.vault.adapter.exists.mockResolvedValue(true);
      mockApp.vault.adapter.write.mockResolvedValue(undefined);

      syncHistory.updateRecord('12345', {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      });

      expect(syncHistory.size()).toBe(1);

      await syncHistory.clearHistory();

      expect(syncHistory.size()).toBe(0);
      expect(mockApp.vault.adapter.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAll', () => {
    it('should return all records', () => {
      const record1: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      };

      const record2: SyncHistoryRecord = {
        pageId: '67890',
        lastSyncedAt: '2025-11-22T10:05:00Z',
        lastModified: '2025-11-22T09:45:00Z',
        filePath: 'confluence/another.md'
      };

      syncHistory.updateRecord('12345', record1);
      syncHistory.updateRecord('67890', record2);

      const allRecords = syncHistory.getAll();

      expect(allRecords.size).toBe(2);
      expect(allRecords.get('12345')).toEqual(record1);
      expect(allRecords.get('67890')).toEqual(record2);
    });
  });

  describe('size', () => {
    it('should return number of records', () => {
      expect(syncHistory.size()).toBe(0);

      syncHistory.updateRecord('12345', {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T09:30:00Z',
        filePath: 'confluence/test.md'
      });

      expect(syncHistory.size()).toBe(1);

      syncHistory.updateRecord('67890', {
        pageId: '67890',
        lastSyncedAt: '2025-11-22T10:05:00Z',
        lastModified: '2025-11-22T09:45:00Z',
        filePath: 'confluence/another.md'
      });

      expect(syncHistory.size()).toBe(2);
    });
  });
});
