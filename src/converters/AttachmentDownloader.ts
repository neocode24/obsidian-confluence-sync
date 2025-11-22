import { Attachment } from '../types/confluence';
import { ConfluenceClient } from '../api/ConfluenceClient';
import { FileManager } from '../utils/FileManager';

/**
 * Confluence 첨부파일 다운로더
 */
export class AttachmentDownloader {
  constructor(
    private confluenceClient: ConfluenceClient,
    private fileManager: FileManager
  ) {}

  /**
   * 페이지의 모든 첨부파일 다운로드
   * @param pageId Confluence 페이지 ID
   * @param pageSlug 페이지 슬러그 (로컬 폴더명)
   * @param onProgress 진행률 콜백 (current, total)
   * @returns URL → 로컬 경로 매핑
   */
  async downloadAttachments(
    pageId: string,
    pageSlug: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    const urlToPathMap = new Map<string, string>();

    try {
      // 1. 첨부파일 목록 조회
      const attachments = await this.confluenceClient.getAttachments(pageId);

      if (attachments.length === 0) {
        console.log(`[AttachmentDownloader] No attachments found for page ${pageId}`);
        return urlToPathMap;
      }

      console.log(`[AttachmentDownloader] Downloading ${attachments.length} attachments for page ${pageId}`);

      // 2. 각 첨부파일 다운로드
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];

        try {
          // 진행률 콜백
          if (onProgress) {
            onProgress(i + 1, attachments.length);
          }

          // 3. 첨부파일 다운로드
          const data = await this.confluenceClient.downloadAttachment(attachment.downloadUrl);

          // 4. 로컬에 저장
          const localPath = await this.fileManager.writeAttachment(
            attachment.title,
            data,
            pageSlug
          );

          // 5. URL 매핑 생성
          // Confluence URL 패턴: /download/attachments/{pageId}/{filename}
          // 또는 전체 URL: https://site.atlassian.net/wiki/download/attachments/...
          const confluenceUrl = attachment.downloadUrl;
          urlToPathMap.set(confluenceUrl, localPath);

          // 파일명만으로도 매칭 가능하도록 추가 매핑
          urlToPathMap.set(attachment.title, localPath);

          console.log(`[AttachmentDownloader] Downloaded: ${attachment.title} → ${localPath}`);
        } catch (error) {
          // 개별 첨부파일 다운로드 실패 시 경고만 출력하고 계속 진행
          console.warn(`[AttachmentDownloader] Failed to download ${attachment.title}:`, error);
          // 원본 URL 유지 (변환하지 않음)
        }
      }

      return urlToPathMap;
    } catch (error) {
      console.error(`[AttachmentDownloader] Failed to download attachments for page ${pageId}:`, error);
      // 전체 실패 시에도 빈 맵 반환 (원본 URL 유지)
      return urlToPathMap;
    }
  }

  /**
   * 마크다운 내 첨부파일 URL을 로컬 경로로 변환
   * @param markdown 원본 마크다운
   * @param urlToPathMap URL → 로컬 경로 매핑
   * @returns 변환된 마크다운
   */
  replaceAttachmentUrls(markdown: string, urlToPathMap: Map<string, string>): string {
    let result = markdown;

    for (const [url, localPath] of urlToPathMap.entries()) {
      // 이미지: ![alt](url) → ![alt](localPath)
      // 링크: [text](url) → [text](localPath)
      // URL을 정규식에서 안전하게 사용하기 위해 이스케이프
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const urlPattern = new RegExp(`\\]\\(${escapedUrl}\\)`, 'g');
      result = result.replace(urlPattern, `](${localPath})`);

      // HTML img 태그: <img src="url"> → <img src="localPath">
      const imgPattern = new RegExp(`src="${escapedUrl}"`, 'g');
      result = result.replace(imgPattern, `src="${localPath}"`);
    }

    return result;
  }
}
