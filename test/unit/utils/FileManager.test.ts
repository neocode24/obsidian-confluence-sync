import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../../../src/utils/FileManager';
import { FileWriteError } from '../../../src/types/errors';

// Mock Obsidian - must be hoisted before imports
vi.mock('obsidian', () => {
  class MockTFile {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
  }

  return {
    Notice: vi.fn(),
    TFile: MockTFile,
    Vault: class Vault {},
  };
});

// Import TFile after mock
import { TFile } from 'obsidian';

// Mock Obsidian Vault API
const mockVault = {
  create: vi.fn(),
  modify: vi.fn(),
  read: vi.fn(),
  getAbstractFileByPath: vi.fn(),
  createFolder: vi.fn(),
};

describe('FileManager', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    vi.clearAllMocks();
    fileManager = new FileManager(mockVault as any);
  });

  describe('writeFile', () => {
    it('should create new file when it does not exist', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue(undefined);
      mockVault.createFolder.mockResolvedValue(undefined);

      await fileManager.writeFile('confluence/test.md', '# Test');

      expect(mockVault.createFolder).toHaveBeenCalledWith('confluence');
      expect(mockVault.create).toHaveBeenCalledWith('confluence/test.md', '# Test');
    });

    it('should modify existing file', async () => {
      const mockFile = new TFile();
      (mockFile as any).path = 'confluence/test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.modify.mockResolvedValue(undefined);

      await fileManager.writeFile('confluence/test.md', '# Updated');

      expect(mockVault.modify).toHaveBeenCalledWith(mockFile, '# Updated');
    });

    it('should reject path traversal attempts', async () => {
      await expect(
        fileManager.writeFile('../../../etc/passwd', 'malicious')
      ).rejects.toThrow(FileWriteError);

      await expect(
        fileManager.writeFile('..\\..\\windows\\system32', 'malicious')
      ).rejects.toThrow(FileWriteError);
    });

    it('should throw FileWriteError on write failure', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.createFolder.mockResolvedValue(undefined);
      mockVault.create.mockRejectedValue(new Error('Disk full'));

      await expect(
        fileManager.writeFile('confluence/test.md', '# Test')
      ).rejects.toThrow(FileWriteError);
    });
  });

  describe('ensureUniqueFileName', () => {
    it('should return original filename if not exists', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);

      const uniqueName = await fileManager.ensureUniqueFileName('test', 'confluence');

      expect(uniqueName).toBe('test.md');
    });

    it('should add suffix -2 if file exists', async () => {
      const mockFile1 = new TFile();
      (mockFile1 as any).path = 'confluence/test.md';

      mockVault.getAbstractFileByPath
        .mockReturnValueOnce(mockFile1) // first check
        .mockReturnValueOnce(null); // second check

      const uniqueName = await fileManager.ensureUniqueFileName('test', 'confluence');

      expect(uniqueName).toBe('test-2.md');
    });

    it('should increment suffix until unique', async () => {
      const mockFile1 = new TFile();
      const mockFile2 = new TFile();
      const mockFile3 = new TFile();
      (mockFile1 as any).path = 'confluence/test.md';
      (mockFile2 as any).path = 'confluence/test-2.md';
      (mockFile3 as any).path = 'confluence/test-3.md';

      mockVault.getAbstractFileByPath
        .mockReturnValueOnce(mockFile1) // test.md exists
        .mockReturnValueOnce(mockFile2) // test-2.md exists
        .mockReturnValueOnce(mockFile3) // test-3.md exists
        .mockReturnValueOnce(null); // test-4.md available

      const uniqueName = await fileManager.ensureUniqueFileName('test', 'confluence');

      expect(uniqueName).toBe('test-4.md');
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const mockFile = new TFile();
      (mockFile as any).path = 'test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

      const exists = await fileManager.fileExists('test.md');

      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);

      const exists = await fileManager.fileExists('test.md');

      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const mockFile = new TFile();
      (mockFile as any).path = 'test.md';
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue('# Content');

      const content = await fileManager.readFile('test.md');

      expect(content).toBe('# Content');
      expect(mockVault.read).toHaveBeenCalledWith(mockFile);
    });

    it('should throw FileWriteError if file not found', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);

      await expect(
        fileManager.readFile('nonexistent.md')
      ).rejects.toThrow(FileWriteError);
    });
  });
});
