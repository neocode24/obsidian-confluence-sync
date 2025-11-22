/**
 * PlantUML 매크로 정보
 */
export interface PlantUMLMacro {
  code: string; // PlantUML 소스 코드
  title?: string; // 다이어그램 제목
  startIndex: number; // HTML 내 시작 위치
  endIndex: number; // HTML 내 끝 위치
}

/**
 * Confluence PlantUML 매크로 파서
 */
export class PlantUMLParser {
  /**
   * HTML에서 PlantUML 매크로 추출
   * @param html Confluence Storage Format HTML
   * @returns PlantUML 매크로 배열
   */
  extractMacros(html: string): PlantUMLMacro[] {
    const macros: PlantUMLMacro[] = [];

    // PlantUML 매크로 패턴: <ac:structured-macro ac:name="plantuml">...</ac:structured-macro>
    const macroPattern = /<ac:structured-macro\s+ac:name="plantuml"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi;

    let match: RegExpExecArray | null;
    while ((match = macroPattern.exec(html)) !== null) {
      const macroContent = match[1];
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;

      // 제목 추출 (선택적)
      const title = this.extractTitle(macroContent);

      // PlantUML 코드 추출 (CDATA 섹션에서)
      const code = this.extractCode(macroContent);

      if (code) {
        macros.push({
          code,
          title,
          startIndex,
          endIndex
        });
      }
    }

    console.log(`[PlantUMLParser] Found ${macros.length} PlantUML macros`);
    return macros;
  }

  /**
   * 매크로에서 제목 추출
   * @param macroContent 매크로 내부 콘텐츠
   * @returns 제목 (없으면 undefined)
   */
  private extractTitle(macroContent: string): string | undefined {
    // <ac:parameter ac:name="title">System Architecture</ac:parameter>
    const titlePattern = /<ac:parameter\s+ac:name="title">([^<]+)<\/ac:parameter>/i;
    const match = macroContent.match(titlePattern);
    return match ? match[1].trim() : undefined;
  }

  /**
   * 매크로에서 PlantUML 코드 추출
   * @param macroContent 매크로 내부 콘텐츠
   * @returns PlantUML 코드
   */
  private extractCode(macroContent: string): string | null {
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
   * PlantUML 매크로를 마크다운 코드 블록으로 변환
   * @param macro PlantUML 매크로
   * @returns 마크다운 코드 블록
   */
  convertToMarkdown(macro: PlantUMLMacro): string {
    let markdown = '';

    // 제목이 있으면 주석으로 추가
    if (macro.title) {
      markdown += `<!-- ${macro.title} -->\n`;
    }

    // 코드 블록
    markdown += '```plantuml\n';
    markdown += macro.code;
    markdown += '\n```';

    return markdown;
  }

  /**
   * HTML에서 PlantUML 매크로 제거 및 플레이스홀더로 치환
   * @param html 원본 HTML
   * @param macros 추출된 매크로 배열
   * @returns 플레이스홀더가 삽입된 HTML
   */
  replaceWithPlaceholders(html: string, macros: PlantUMLMacro[]): string {
    // 역순으로 처리하여 인덱스 변경 문제 방지
    let result = html;
    for (let i = macros.length - 1; i >= 0; i--) {
      const macro = macros[i];
      // 텍스트 형식 플레이스홀더 (Turndown이 텍스트로 변환)
      const placeholder = `<p>__PLANTUML_PLACEHOLDER_${i}__</p>`;
      result = result.substring(0, macro.startIndex) + placeholder + result.substring(macro.endIndex);
    }
    return result;
  }

  /**
   * 플레이스홀더를 마크다운 코드 블록으로 복원
   * @param markdown 플레이스홀더가 포함된 마크다운
   * @param macros 원본 매크로 배열
   * @returns 최종 마크다운
   */
  restorePlaceholders(markdown: string, macros: PlantUMLMacro[]): string {
    let result = markdown;
    for (let i = 0; i < macros.length; i++) {
      // Turndown escapes underscores, so we need to match the escaped version
      const escapedPlaceholder = `\\_\\_PLANTUML\\_PLACEHOLDER\\_${i}\\_\\_`;
      const codeBlock = this.convertToMarkdown(macros[i]);
      result = result.replace(escapedPlaceholder, codeBlock);
    }
    return result;
  }
}
