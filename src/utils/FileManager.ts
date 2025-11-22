import { Notice, TFile, Vault } from 'obsidian';
import { FileWriteError } from '../types/errors';

/**
 * Obsidian Vault 파일 시스템 작업 관리
 */
export class FileManager {
  constructor(private vault: Vault) {}

  /**
   * 파일을 Vault에 저장
   * @param filePath Vault 내 상대 경로 (예: "confluence/page.md")
   * @param content 파일 내용
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Path traversal 공격 방지
      if (filePath.includes('../') || filePath.includes('..\\')) {
        throw new FileWriteError(
          'Invalid file path: path traversal detected',
          { filePath }
        );
      }

      // 폴더 경로 추출
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (folderPath) {
        await this.ensureFolderExists(folderPath);
      }

      // 파일 존재 여부 확인
      const existingFile = this.vault.getAbstractFileByPath(filePath);

      if (existingFile instanceof TFile) {
        // 파일이 이미 존재하면 수정
        await this.vault.modify(existingFile, content);
      } else {
        // 새 파일 생성
        await this.vault.create(filePath, content);
      }

      new Notice(`✓ File saved: ${filePath}`);
    } catch (error) {
      console.error(`[FileManager] Failed to write file ${filePath}:`, error);

      if (error instanceof FileWriteError) {
        throw error;
      }

      throw new FileWriteError(
        `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filePath, error }
      );
    }
  }

  /**
   * 고유한 파일명 생성 (중복 시 숫자 suffix 추가)
   * @param fileName 원본 파일명 (확장자 제외)
   * @param folderPath 폴더 경로
   * @returns 고유한 파일명 (확장자 포함)
   */
  async ensureUniqueFileName(fileName: string, folderPath: string): Promise<string> {
    let uniqueName = `${fileName}.md`;
    let counter = 2;

    while (await this.fileExists(`${folderPath}/${uniqueName}`)) {
      uniqueName = `${fileName}-${counter}.md`;
      counter++;
    }

    return uniqueName;
  }

  /**
   * 파일 존재 여부 확인
   * @param filePath Vault 내 상대 경로
   * @returns 파일 존재 여부
   */
  async fileExists(filePath: string): Promise<boolean> {
    const file = this.vault.getAbstractFileByPath(filePath);
    return file instanceof TFile;
  }

  /**
   * 폴더가 존재하지 않으면 생성
   * @param folderPath 폴더 경로
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.vault.createFolder(folderPath);
    }
  }

  /**
   * 파일 읽기
   * @param filePath Vault 내 상대 경로
   * @returns 파일 내용
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const file = this.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        throw new FileWriteError(
          `File not found: ${filePath}`,
          { filePath }
        );
      }

      return await this.vault.read(file);
    } catch (error) {
      console.error(`[FileManager] Failed to read file ${filePath}:`, error);

      if (error instanceof FileWriteError) {
        throw error;
      }

      throw new FileWriteError(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filePath, error }
      );
    }
  }
}
