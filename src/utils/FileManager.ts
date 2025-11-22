import { Notice, TFile, Vault } from 'obsidian';
import { FileWriteError } from '../types/errors';
import { parseFileContent, extractFrontmatter, CONFLUENCE_START_MARKER, CONFLUENCE_END_MARKER } from './ContentRegionParser';

/**
 * Obsidian Vault 파일 시스템 작업 관리
 */
export class FileManager {
  constructor(private vault: Vault) {}

  /**
   * 파일을 Vault에 저장
   * @param filePath Vault 내 상대 경로 (예: "confluence/page.md")
   * @param content 파일 내용 (frontmatter + Confluence content with markers)
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

      let finalContent = content;

      if (existingFile instanceof TFile) {
        // 기존 파일이 있으면 로컬 메모 영역 보존
        const existingContent = await this.vault.read(existingFile);
        finalContent = this.mergeWithLocalNotes(content, existingContent);
        await this.vault.modify(existingFile, finalContent);
      } else {
        // 신규 파일 생성 시 로컬 메모 템플릿 추가
        finalContent = this.addLocalNotesTemplate(content);
        await this.vault.create(filePath, finalContent);
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
   * 기존 파일의 로컬 메모 영역을 새 콘텐츠와 병합
   * @param newContent 새로운 Confluence 콘텐츠 (frontmatter + markers 포함)
   * @param existingContent 기존 파일 콘텐츠
   * @returns 병합된 콘텐츠
   */
  private mergeWithLocalNotes(newContent: string, existingContent: string): string {
    // existingContent가 없거나 undefined인 경우 템플릿만 추가
    if (!existingContent) {
      return this.addLocalNotesTemplate(newContent);
    }

    // 기존 파일에서 로컬 메모 영역 추출
    const parsed = parseFileContent(existingContent);

    // 로컬 메모가 있으면 새 콘텐츠에 추가
    if (parsed.localNotes) {
      return `${newContent}\n\n${parsed.localNotes}`;
    }

    // 로컬 메모가 없으면 템플릿 추가
    return this.addLocalNotesTemplate(newContent);
  }

  /**
   * 신규 파일에 로컬 메모 템플릿 추가
   * @param content Confluence 콘텐츠 (frontmatter + markers 포함)
   * @returns 로컬 메모 템플릿이 추가된 콘텐츠
   */
  private addLocalNotesTemplate(content: string): string {
    const template = `\n## Local Notes\n\n<!-- Add your personal notes here -->\n\n## Backlinks\n\n<!-- Link to related notes using [[Note Name]] -->`;
    return `${content}${template}`;
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

  /**
   * Draw.io 파일을 attachments 폴더에 저장
   * @param filename 파일명 (예: "page-diagram-0.drawio")
   * @param xml Draw.io XML 데이터
   * @param attachmentsFolder attachments 폴더 경로 (기본: "confluence/attachments")
   */
  async writeDrawioFile(filename: string, xml: string, attachmentsFolder: string = 'confluence/attachments'): Promise<void> {
    try {
      // Path traversal 공격 방지
      if (filename.includes('../') || filename.includes('..\\')) {
        throw new FileWriteError(
          'Invalid filename: path traversal detected',
          { filename }
        );
      }

      // attachments 폴더 생성
      await this.ensureFolderExists(attachmentsFolder);

      const filePath = `${attachmentsFolder}/${filename}`;

      // 파일 존재 여부 확인
      const existingFile = this.vault.getAbstractFileByPath(filePath);

      if (existingFile instanceof TFile) {
        // 기존 파일 덮어쓰기
        await this.vault.modify(existingFile, xml);
      } else {
        // 신규 파일 생성
        await this.vault.create(filePath, xml);
      }

      console.log(`[FileManager] Draw.io file saved: ${filePath}`);
    } catch (error) {
      console.error(`[FileManager] Failed to write Draw.io file ${filename}:`, error);

      if (error instanceof FileWriteError) {
        throw error;
      }

      throw new FileWriteError(
        `Failed to write Draw.io file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filename, error }
      );
    }
  }

  /**
   * 첨부파일(바이너리)을 attachments 폴더에 저장
   * @param filename 파일명
   * @param data 파일 데이터 (ArrayBuffer)
   * @param pageSlug 페이지 슬러그 (폴더명으로 사용)
   * @returns 저장된 파일의 상대 경로
   */
  async writeAttachment(filename: string, data: ArrayBuffer, pageSlug: string): Promise<string> {
    try {
      // Path traversal 공격 방지
      if (filename.includes('../') || filename.includes('..\\') || pageSlug.includes('../') || pageSlug.includes('..\\')) {
        throw new FileWriteError(
          'Invalid filename or pageSlug: path traversal detected',
          { filename, pageSlug }
        );
      }

      const attachmentFolder = `confluence/attachments/${pageSlug}`;
      await this.ensureFolderExists(attachmentFolder);

      // 파일명 중복 방지
      const uniqueFilename = await this.ensureUniqueAttachmentFilename(filename, attachmentFolder);
      const filePath = `${attachmentFolder}/${uniqueFilename}`;

      // ArrayBuffer를 Uint8Array로 변환
      const uint8Array = new Uint8Array(data);

      // 파일 존재 여부 확인
      const existingFile = this.vault.getAbstractFileByPath(filePath);

      if (existingFile instanceof TFile) {
        // 기존 파일 덮어쓰기
        await this.vault.modifyBinary(existingFile, uint8Array);
      } else {
        // 신규 파일 생성
        await this.vault.createBinary(filePath, uint8Array);
      }

      console.log(`[FileManager] Attachment saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`[FileManager] Failed to write attachment ${filename}:`, error);

      if (error instanceof FileWriteError) {
        throw error;
      }

      throw new FileWriteError(
        `Failed to write attachment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filename, pageSlug, error }
      );
    }
  }

  /**
   * 첨부파일 고유 파일명 생성 (중복 시 숫자 suffix 추가)
   * @param filename 원본 파일명
   * @param folderPath 폴더 경로
   * @returns 고유한 파일명
   */
  private async ensureUniqueAttachmentFilename(filename: string, folderPath: string): Promise<string> {
    let uniqueName = filename;
    let counter = 2;

    while (await this.fileExists(`${folderPath}/${uniqueName}`)) {
      // 파일명과 확장자 분리
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex > 0) {
        const base = filename.substring(0, lastDotIndex);
        const ext = filename.substring(lastDotIndex);
        uniqueName = `${base}-${counter}${ext}`;
      } else {
        uniqueName = `${filename}-${counter}`;
      }
      counter++;
    }

    return uniqueName;
  }
}
