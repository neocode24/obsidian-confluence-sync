import TurndownService from 'turndown';
import { ConfluencePage } from '../types/confluence';
import { PlantUMLParser } from './PlantUMLParser';

/**
 * Confluence Storage Format HTML을 Obsidian 호환 마크다운으로 변환
 */
export class MarkdownConverter {
  private turndown: TurndownService;
  private plantUMLParser: PlantUMLParser;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    this.plantUMLParser = new PlantUMLParser();
    this.configureTurndown();
  }

  /**
   * Turndown 변환 규칙 설정
   */
  private configureTurndown(): void {
    // HTML 주석 보존 (PlantUML 플레이스홀더용)
    this.turndown.addRule('preserveComments', {
      filter: (node) => {
        return node.nodeType === 8; // Comment node
      },
      replacement: (content) => {
        return `<!--${content}-->`;
      },
    });

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
      // 1. PlantUML 매크로 추출 (HTML → Markdown 변환 전)
      const plantUMLMacros = this.plantUMLParser.extractMacros(page.content);

      let processedContent = page.content;

      // 2. PlantUML 매크로가 있으면 플레이스홀더로 치환
      if (plantUMLMacros.length > 0) {
        processedContent = this.plantUMLParser.replaceWithPlaceholders(page.content, plantUMLMacros);
      }

      // 3. Turndown으로 HTML → Markdown 변환
      let markdown = this.turndown.turndown(processedContent);

      // 4. 플레이스홀더를 코드 블록으로 복원
      if (plantUMLMacros.length > 0) {
        markdown = this.plantUMLParser.restorePlaceholders(markdown, plantUMLMacros);
      }

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

    // PlantUML 처리 (convertPage와 동일한 로직)
    const plantUMLMacros = this.plantUMLParser.extractMacros(html);

    let processedContent = html;
    if (plantUMLMacros.length > 0) {
      processedContent = this.plantUMLParser.replaceWithPlaceholders(html, plantUMLMacros);
    }

    let markdown = this.turndown.turndown(processedContent);

    if (plantUMLMacros.length > 0) {
      markdown = this.plantUMLParser.restorePlaceholders(markdown, plantUMLMacros);
    }

    return markdown.trim();
  }
}
