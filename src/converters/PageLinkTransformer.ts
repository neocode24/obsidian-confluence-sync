/**
 * Confluence 페이지 링크를 Obsidian 위키링크로 변환
 */
export class PageLinkTransformer {
  /**
   * HTML에서 Confluence 페이지 링크 추출
   * @param html Confluence HTML
   * @returns Map<pageId, originalUrl>
   */
  extractPageLinks(html: string): Map<string, string> {
    const pageLinks = new Map<string, string>();

    // Confluence 페이지 링크 패턴
    // 1. /wiki/spaces/{space}/pages/{pageId}/...
    // 2. /wiki/pages/{pageId}
    // 3. https://site.atlassian.net/wiki/spaces/{space}/pages/{pageId}/...
    const linkPatterns = [
      /href="([^"]*\/wiki\/spaces\/[^\/]+\/pages\/(\d+)[^"]*)"/gi,
      /href="([^"]*\/wiki\/pages\/(\d+)[^"]*)"/gi,
      /href="(https?:\/\/[^\/]+\/wiki\/spaces\/[^\/]+\/pages\/(\d+)[^"]*)"/gi,
    ];

    for (const pattern of linkPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        const pageId = match[2];
        pageLinks.set(pageId, url);
      }
    }

    console.log(`[PageLinkTransformer] Found ${pageLinks.size} Confluence page links`);
    return pageLinks;
  }

  /**
   * 마크다운 내 Confluence 링크를 Obsidian 위키링크로 변환
   * @param markdown 원본 마크다운
   * @param pageIdToFileMap 페이지 ID → 파일명 매핑 (SyncHistory에서 제공)
   * @returns 변환된 마크다운
   */
  transformLinks(markdown: string, pageIdToFileMap: Map<string, string>): string {
    let result = markdown;

    // Confluence 링크 패턴 매칭
    // [text](/wiki/spaces/SPACE/pages/123456789/...)
    // [text](/wiki/pages/123456789)
    const linkPattern = /\[([^\]]+)\]\(([^)]*\/wiki\/(?:spaces\/[^\/]+\/)?pages\/(\d+)[^)]*)\)/g;

    result = result.replace(linkPattern, (match, text, url, pageId) => {
      // 페이지 ID로 파일명 조회
      const filename = pageIdToFileMap.get(pageId);

      if (filename) {
        // 동기화된 페이지: 위키링크로 변환
        // 파일명에서 .md 확장자 제거
        const filenameWithoutExt = filename.replace(/\.md$/, '');

        // 텍스트가 파일명과 같으면 간단한 형식
        if (text === filenameWithoutExt || text === filename) {
          return `[[${filenameWithoutExt}]]`;
        }

        // 텍스트가 다르면 별칭 사용
        return `[[${filenameWithoutExt}|${text}]]`;
      } else {
        // 동기화 안 된 페이지: 원본 유지 + TODO 주석
        return `${match} <!-- TODO: Link to unsynced page (ID: ${pageId}) -->`;
      }
    });

    return result;
  }

  /**
   * 외부 링크 여부 확인
   * @param url URL
   * @returns true if external link
   */
  isExternalLink(url: string): boolean {
    // Confluence 페이지 링크가 아닌 경우 외부 링크로 간주
    return !/\/wiki\/(?:spaces\/[^\/]+\/)?pages\/\d+/.test(url);
  }
}
