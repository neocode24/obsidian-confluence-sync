/**
 * Confluence API 데이터 모델
 * Confluence REST API v2 응답을 TypeScript 타입으로 정의
 */

/**
 * Confluence 페이지 첨부파일
 */
export interface Attachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
  downloadUrl: string;
  pageId: string;
}

/**
 * Confluence 페이지
 */
export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  content: string;
  version: number;
  lastModified: string;
  author: string;
  url: string;
  labels: string[];
  parentId?: string;
  attachments?: Attachment[];
}

/**
 * 페이지 검색 결과
 */
export interface PageSearchResult {
  results: ConfluencePage[];
  cursor?: string;
  hasMore: boolean;
}
