import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../../src/utils/FileManager';
import { MetadataBuilder } from '../../src/converters/MetadataBuilder';
import { ConfluencePage } from '../../src/types/confluence';
import { CONFLUENCE_START_MARKER, CONFLUENCE_END_MARKER } from '../../src/utils/ContentRegionParser';

// Mock Obsidian
vi.mock('obsidian', () => {
  class MockTFile {
    path: string;
    constructor(path: string = '') {
      this.path = path;
    }
  }

  return {
    Notice: vi.fn(),
    TFile: MockTFile,
    Vault: class Vault {},
  };
});

import { TFile } from 'obsidian';

describe('Content Region Preservation - Integration Tests', () => {
  let mockVault: any;
  let fileManager: FileManager;
  let metadataBuilder: MetadataBuilder;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Vault API
    mockVault = {
      create: vi.fn(),
      modify: vi.fn(),
      read: vi.fn(),
      getAbstractFileByPath: vi.fn(),
      createFolder: vi.fn(),
    };

    fileManager = new FileManager(mockVault);
    metadataBuilder = new MetadataBuilder();
  });

  describe('First Sync: New File Creation', () => {
    it('should create file with markers and local notes template', async () => {
      // Setup
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue(undefined);
      mockVault.createFolder.mockResolvedValue(undefined);

      // Create Confluence page
      const page: ConfluencePage = {
        id: '12345',
        title: 'Test Page',
        spaceKey: 'TEST',
        content: '<h1>Original Content</h1>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: ['test'],
      };

      // Build content
      const frontmatter = metadataBuilder.buildFrontmatter(page);
      const markdown = '# Original Content';
      const content = metadataBuilder.combineContent(frontmatter, markdown);

      // Save file
      await fileManager.writeFile('confluence/test.md', content);

      // Verify file was created with markers
      expect(mockVault.create).toHaveBeenCalledOnce();
      const savedContent = mockVault.create.mock.calls[0][1];

      // Check structure
      expect(savedContent).toContain('---\ntitle: Test Page');
      expect(savedContent).toContain(CONFLUENCE_START_MARKER);
      expect(savedContent).toContain('# Original Content');
      expect(savedContent).toContain(CONFLUENCE_END_MARKER);
      expect(savedContent).toContain('## Local Notes');
      expect(savedContent).toContain('## Backlinks');
    });
  });

  describe('Re-Sync: Preserve Local Notes', () => {
    it('should preserve local notes when updating Confluence content', async () => {
      // Setup: Existing file with local notes
      const existingContent = `---
title: Test Page
confluence_id: '12345'
---

${CONFLUENCE_START_MARKER}
# Original Content

This is the old version.
${CONFLUENCE_END_MARKER}

## Local Notes

My personal thoughts about this page.
- Important point 1
- Important point 2

## Backlinks

- [[Related Page 1]]
- [[Project Overview]]`;

      const mockFile = new TFile();
      (mockFile as any).path = 'confluence/test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue(existingContent);
      mockVault.modify.mockResolvedValue(undefined);

      // New Confluence page (updated version)
      const updatedPage: ConfluencePage = {
        id: '12345',
        title: 'Test Page',
        spaceKey: 'TEST',
        content: '<h1>Updated Content</h1><p>This is new.</p>',
        version: 2,
        lastModified: '2025-11-22T01:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: ['test', 'updated'],
      };

      // Build new content
      const frontmatter = metadataBuilder.buildFrontmatter(updatedPage);
      const markdown = '# Updated Content\n\nThis is new.';
      const newContent = metadataBuilder.combineContent(frontmatter, markdown);

      // Save (should trigger merge)
      await fileManager.writeFile('confluence/test.md', newContent);

      // Verify modify was called
      expect(mockVault.modify).toHaveBeenCalledOnce();
      const mergedContent = mockVault.modify.mock.calls[0][1];

      // Verify new Confluence content is present
      expect(mergedContent).toContain('# Updated Content');
      expect(mergedContent).toContain('This is new.');

      // Verify old content is NOT present
      expect(mergedContent).not.toContain('This is the old version.');

      // CRITICAL: Verify local notes are preserved
      expect(mergedContent).toContain('## Local Notes');
      expect(mergedContent).toContain('My personal thoughts about this page.');
      expect(mergedContent).toContain('- Important point 1');
      expect(mergedContent).toContain('- Important point 2');
      expect(mergedContent).toContain('## Backlinks');
      expect(mergedContent).toContain('- [[Related Page 1]]');
      expect(mergedContent).toContain('- [[Project Overview]]');

      // Verify structure: frontmatter → markers → local notes
      const lines = mergedContent.split('\n');
      const confluenceStartIdx = lines.findIndex((l: string) => l.includes(CONFLUENCE_START_MARKER));
      const confluenceEndIdx = lines.findIndex((l: string) => l.includes(CONFLUENCE_END_MARKER));
      const localNotesIdx = lines.findIndex((l: string) => l.includes('## Local Notes'));

      expect(confluenceStartIdx).toBeGreaterThan(0); // After frontmatter
      expect(confluenceEndIdx).toBeGreaterThan(confluenceStartIdx);
      expect(localNotesIdx).toBeGreaterThan(confluenceEndIdx); // After Confluence region
    });

    it('should handle multiple re-syncs without duplicating local notes', async () => {
      // First sync
      const firstContent = `---
title: Test
---

${CONFLUENCE_START_MARKER}
# Version 1
${CONFLUENCE_END_MARKER}

## Local Notes
Note 1`;

      const mockFile = new TFile();
      (mockFile as any).path = 'confluence/test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue(firstContent);
      mockVault.modify.mockResolvedValue(undefined);

      // Second sync
      const secondUpdate = `---
title: Test
---

${CONFLUENCE_START_MARKER}
# Version 2
${CONFLUENCE_END_MARKER}`;

      await fileManager.writeFile('confluence/test.md', secondUpdate);

      const secondContent = mockVault.modify.mock.calls[0][1];
      const note1Count = (secondContent.match(/## Local Notes/g) || []).length;
      expect(note1Count).toBe(1); // Should not duplicate

      // Third sync
      mockVault.read.mockResolvedValue(secondContent);
      const thirdUpdate = `---
title: Test
---

${CONFLUENCE_START_MARKER}
# Version 3
${CONFLUENCE_END_MARKER}`;

      await fileManager.writeFile('confluence/test.md', thirdUpdate);

      const thirdContent = mockVault.modify.mock.calls[1][1];
      const note2Count = (thirdContent.match(/## Local Notes/g) || []).length;
      expect(note2Count).toBe(1); // Still no duplication
      expect(thirdContent).toContain('Note 1'); // Original note preserved
    });
  });

  describe('Edge Cases', () => {
    it('should handle file without markers (legacy format)', async () => {
      // Existing file without markers (created before Story 2.1)
      const legacyContent = `---
title: Legacy Page
---

# Legacy Content

This was created before markers were implemented.`;

      const mockFile = new TFile();
      (mockFile as any).path = 'confluence/legacy.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue(legacyContent);
      mockVault.modify.mockResolvedValue(undefined);

      // Update with new format
      const newContent = `---
title: Legacy Page
---

${CONFLUENCE_START_MARKER}
# Updated Content
${CONFLUENCE_END_MARKER}`;

      await fileManager.writeFile('confluence/legacy.md', newContent);

      const savedContent = mockVault.modify.mock.calls[0][1];

      // Should add local notes template since no markers found
      expect(savedContent).toContain('# Updated Content');
      expect(savedContent).toContain('## Local Notes');
      expect(savedContent).toContain('## Backlinks');
    });

    it('should handle empty local notes section gracefully', async () => {
      const existingContent = `---
title: Test
---

${CONFLUENCE_START_MARKER}
# Content
${CONFLUENCE_END_MARKER}

## Local Notes

## Backlinks`;

      const mockFile = new TFile();
      (mockFile as any).path = 'confluence/test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue(existingContent);
      mockVault.modify.mockResolvedValue(undefined);

      const newContent = `---
title: Test
---

${CONFLUENCE_START_MARKER}
# Updated
${CONFLUENCE_END_MARKER}`;

      await fileManager.writeFile('confluence/test.md', newContent);

      const savedContent = mockVault.modify.mock.calls[0][1];

      // Should preserve empty sections
      expect(savedContent).toContain('## Local Notes');
      expect(savedContent).toContain('## Backlinks');
    });
  });
});
