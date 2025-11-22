/**
 * Draw.io 매크로 정보
 */
export interface DrawioMacro {
  xml: string; // Draw.io XML 데이터
  name?: string; // 다이어그램 이름
  startIndex: number; // HTML 내 시작 위치
  endIndex: number; // HTML 내 끝 위치
}

/**
 * Confluence Draw.io 매크로 파서
 */
export class DrawioParser {
  /**
   * HTML에서 Draw.io 매크로 추출
   * @param html Confluence Storage Format HTML
   * @returns Draw.io 매크로 배열
   */
  extractMacros(html: string): DrawioMacro[] {
    const macros: DrawioMacro[] = [];

    // Draw.io 매크로 패턴: <ac:structured-macro ac:name="drawio">...</ac:structured-macro>
    const macroPattern = /<ac:structured-macro\s+ac:name="drawio"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi;

    let match: RegExpExecArray | null;
    while ((match = macroPattern.exec(html)) !== null) {
      const macroContent = match[1];
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;

      // 이름 추출 (선택적)
      const name = this.extractName(macroContent);

      // Draw.io XML 추출 (CDATA 섹션에서)
      const xml = this.extractXml(macroContent);

      if (xml) {
        macros.push({
          xml,
          name,
          startIndex,
          endIndex
        });
      }
    }

    console.log(`[DrawioParser] Found ${macros.length} Draw.io macros`);
    return macros;
  }

  /**
   * 매크로에서 이름 추출
   * @param macroContent 매크로 내부 콘텐츠
   * @returns 이름 (없으면 undefined)
   */
  private extractName(macroContent: string): string | undefined {
    // <ac:parameter ac:name="name">System Architecture</ac:parameter>
    const namePattern = /<ac:parameter\s+ac:name="name">([^<]+)<\/ac:parameter>/i;
    const match = macroContent.match(namePattern);
    return match ? match[1].trim() : undefined;
  }

  /**
   * 매크로에서 Draw.io XML 추출
   * @param macroContent 매크로 내부 콘텐츠
   * @returns Draw.io XML
   */
  private extractXml(macroContent: string): string | null {
    // <ac:plain-text-body><![CDATA[...]]></ac:plain-text-body>
    const cdataPattern = /<ac:plain-text-body>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/ac:plain-text-body>/i;
    const match = macroContent.match(cdataPattern);

    if (match) {
      return match[1].trim();
    }

    // CDATA 없이 직접 텍스트로 들어있는 경우
    const textPattern = /<ac:plain-text-body>([\s\S]*?)<\/ac:plain-text-body>/i;
    const textMatch = macroContent.match(textPattern);

    if (textMatch) {
      return textMatch[1].trim();
    }

    return null;
  }

  /**
   * 파일명 생성
   * @param pageSlug 페이지 슬러그
   * @param index 다이어그램 인덱스
   * @returns .drawio 파일명
   */
  generateFilename(pageSlug: string, index: number): string {
    return `${pageSlug}-diagram-${index}.drawio`;
  }

  /**
   * HTML에서 Draw.io 매크로 제거 및 플레이스홀더로 치환
   * @param html 원본 HTML
   * @param macros 추출된 매크로 배열
   * @returns 플레이스홀더가 삽입된 HTML
   */
  replaceWithPlaceholders(html: string, macros: DrawioMacro[]): string {
    // 역순으로 처리하여 인덱스 변경 문제 방지
    let result = html;
    for (let i = macros.length - 1; i >= 0; i--) {
      const macro = macros[i];
      // <p> 태그로 감싸서 Turndown이 처리하도록 함
      const placeholder = `<p>__DRAWIO_PLACEHOLDER_${i}__</p>`;
      result = result.substring(0, macro.startIndex) + placeholder + result.substring(macro.endIndex);
    }
    return result;
  }

  /**
   * 플레이스홀더를 Obsidian 임베딩 코드로 복원
   * @param markdown 플레이스홀더가 포함된 마크다운
   * @param filenames 생성된 .drawio 파일명 배열
   * @returns 최종 마크다운
   */
  restorePlaceholders(markdown: string, filenames: string[]): string {
    let result = markdown;
    for (let i = 0; i < filenames.length; i++) {
      // Turndown이 underscores를 이스케이프하므로 escaped 형태로 매칭
      const escapedPlaceholder = `\\_\\_DRAWIO\\_PLACEHOLDER\\_${i}\\_\\_`;
      const embedding = `![[${filenames[i]}]]`;
      result = result.replace(escapedPlaceholder, embedding);
    }
    return result;
  }
}
