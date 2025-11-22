import TurndownService from 'turndown';
import { ConfluencePage } from '../types/confluence';

/**
 * Confluence Storage Format HTML을 Obsidian 호환 마크다운으로 변환
 */
export class MarkdownConverter {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    this.configureTurndown();
  }

  /**
   * Turndown 변환 규칙 설정
   */
  private configureTurndown(): void {
    // Code block 언어 힌트 유지
    this.turndown.addRule('confluenceCodeBlock', {
      filter: (node) => {
        return (
          node.nodeName === 'PRE' ||
          (node.nodeName === 'AC:PLAIN-TEXT-BODY' && node.parentNode?.nodeName === 'AC:STRUCTURED-MACRO')
        );
      },
      replacement: (content, node) => {
        // Confluence code macro language parameter 추출 시도
        const parent = (node as Element).closest('ac\\:structured-macro');
        let language = '';
        if (parent) {
          const langParam = parent.querySelector('ac\\:parameter[ac\\:name="language"]');
          if (langParam) {
            language = langParam.textContent || '';
          }
        }
        return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
      },
    });

    // Table 변환 개선 (빈 셀 처리)
    this.turndown.addRule('confluenceTable', {
      filter: 'table',
      replacement: (content, node) => {
        return '\n' + content + '\n';
      },
    });
  }

  /**
   * Confluence 페이지를 마크다운으로 변환
   * @param page Confluence 페이지 객체
   * @returns 변환된 마크다운 문자열
   */
  async convertPage(page: ConfluencePage): Promise<string> {
    if (!page.content || page.content.trim() === '') {
      return '';
    }

    try {
      const markdown = this.turndown.turndown(page.content);
      return markdown.trim();
    } catch (error) {
      console.error(`[MarkdownConverter] Failed to convert page ${page.id}:`, error);
      throw new Error(`Markdown conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * HTML 문자열을 마크다운으로 직접 변환 (테스트용)
   * @param html HTML 문자열
   * @returns 변환된 마크다운 문자열
   */
  convertHtml(html: string): string {
    if (!html || html.trim() === '') {
      return '';
    }
    return this.turndown.turndown(html).trim();
  }
}
