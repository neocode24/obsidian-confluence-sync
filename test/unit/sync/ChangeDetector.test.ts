import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeDetector } from '../../../src/sync/ChangeDetector';
import { SyncHistory, SyncHistoryRecord } from '../../../src/sync/SyncHistory';
import { ConfluencePage } from '../../../src/types/confluence';

// Mock SyncHistory
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

describe('ChangeDetector', () => {
  let syncHistory: SyncHistory;
  let changeDetector: ChangeDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    syncHistory = new SyncHistory(mockApp);
    changeDetector = new ChangeDetector(syncHistory, false);
  });

  describe('needsUpdate', () => {
    it('should return true for new page (no history record)', () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'New Page',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T10:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const result = changeDetector.needsUpdate(page, undefined);

      expect(result).toBe(true);
    });

    it('should return true if Confluence page is newer', () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Updated Page',
        spaceKey: 'TEST',
        content: '<p>Updated content</p>',
        version: 2,
        lastModified: '2025-11-22T11:00:00Z', // Newer
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Older
        filePath: 'confluence/updated-page.md'
      };

      const result = changeDetector.needsUpdate(page, record);

      expect(result).toBe(true);
    });

    it('should return false if Confluence page is same as local', () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Unchanged Page',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T10:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:05:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Same
        filePath: 'confluence/unchanged-page.md'
      };

      const result = changeDetector.needsUpdate(page, record);

      expect(result).toBe(false);
    });

    it('should return false if Confluence page is older than local', () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Old Page',
        spaceKey: 'TEST',
        content: '<p>Old content</p>',
        version: 1,
        lastModified: '2025-11-22T09:00:00Z', // Older
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Newer
        filePath: 'confluence/old-page.md'
      };

      const result = changeDetector.needsUpdate(page, record);

      expect(result).toBe(false);
    });

    it('should return true when forceSync is enabled (ignore timestamps)', () => {
      const forcedDetector = new ChangeDetector(syncHistory, true);

      const page: ConfluencePage = {
        id: '12345',
        title: 'Unchanged Page',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T09:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Newer than page
        filePath: 'confluence/unchanged-page.md'
      };

      const result = forcedDetector.needsUpdate(page, record);

      expect(result).toBe(true);
    });
  });

  describe('filterChangedPages', () => {
    it('should return only changed pages', async () => {
      const pages: ConfluencePage[] = [
        {
          id: '111',
          title: 'New Page',
          spaceKey: 'TEST',
          content: '<p>Content</p>',
          version: 1,
          lastModified: '2025-11-22T10:00:00Z',
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/111',
          labels: []
        },
        {
          id: '222',
          title: 'Updated Page',
          spaceKey: 'TEST',
          content: '<p>Updated</p>',
          version: 2,
          lastModified: '2025-11-22T11:00:00Z', // Newer
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/222',
          labels: []
        },
        {
          id: '333',
          title: 'Unchanged Page',
          spaceKey: 'TEST',
          content: '<p>Same</p>',
          version: 1,
          lastModified: '2025-11-22T09:00:00Z', // Older
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/333',
          labels: []
        }
      ];

      // Add history for page 222 and 333
      syncHistory.updateRecord('222', {
        pageId: '222',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Older than current
        filePath: 'confluence/updated-page.md'
      });

      syncHistory.updateRecord('333', {
        pageId: '333',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Newer than current
        filePath: 'confluence/unchanged-page.md'
      });

      const changedPages = await changeDetector.filterChangedPages(pages);

      expect(changedPages.length).toBe(2);
      expect(changedPages.find(p => p.id === '111')).toBeDefined(); // New
      expect(changedPages.find(p => p.id === '222')).toBeDefined(); // Updated
      expect(changedPages.find(p => p.id === '333')).toBeUndefined(); // Unchanged
    });

    it('should return all pages when forceSync is enabled', async () => {
      const forcedDetector = new ChangeDetector(syncHistory, true);

      const pages: ConfluencePage[] = [
        {
          id: '111',
          title: 'Page 1',
          spaceKey: 'TEST',
          content: '<p>Content</p>',
          version: 1,
          lastModified: '2025-11-22T09:00:00Z',
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/111',
          labels: []
        },
        {
          id: '222',
          title: 'Page 2',
          spaceKey: 'TEST',
          content: '<p>Content</p>',
          version: 1,
          lastModified: '2025-11-22T09:00:00Z',
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/222',
          labels: []
        }
      ];

      // Add history for both (newer than pages)
      syncHistory.updateRecord('111', {
        pageId: '111',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z',
        filePath: 'confluence/page-1.md'
      });

      syncHistory.updateRecord('222', {
        pageId: '222',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z',
        filePath: 'confluence/page-2.md'
      });

      const changedPages = await forcedDetector.filterChangedPages(pages);

      expect(changedPages.length).toBe(2); // All pages returned
    });

    it('should return empty array when no pages need update', async () => {
      const pages: ConfluencePage[] = [
        {
          id: '111',
          title: 'Old Page',
          spaceKey: 'TEST',
          content: '<p>Content</p>',
          version: 1,
          lastModified: '2025-11-22T09:00:00Z', // Older
          author: 'test@example.com',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/111',
          labels: []
        }
      ];

      syncHistory.updateRecord('111', {
        pageId: '111',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z', // Newer
        filePath: 'confluence/old-page.md'
      });

      const changedPages = await changeDetector.filterChangedPages(pages);

      expect(changedPages.length).toBe(0);
    });
  });

  describe('setForceSync', () => {
    it('should update forceSync option', () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Page',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T09:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const record: SyncHistoryRecord = {
        pageId: '12345',
        lastSyncedAt: '2025-11-22T10:00:00Z',
        lastModified: '2025-11-22T10:00:00Z',
        filePath: 'confluence/page.md'
      };

      // Initially false
      expect(changeDetector.needsUpdate(page, record)).toBe(false);

      // Enable forceSync
      changeDetector.setForceSync(true);
      expect(changeDetector.needsUpdate(page, record)).toBe(true);

      // Disable forceSync
      changeDetector.setForceSync(false);
      expect(changeDetector.needsUpdate(page, record)).toBe(false);
    });
  });
});
