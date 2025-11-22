import TurndownService from 'turndown';
import { ConfluencePage } from '../types/confluence';
import { PlantUMLParser } from './PlantUMLParser';
import { DrawioParser } from './DrawioParser';
import { FileManager } from '../utils/FileManager';

/**
 * Confluence Storage Format HTML을 Obsidian 호환 마크다운으로 변환
 */
export class MarkdownConverter {
  private turndown: TurndownService;
  private plantUMLParser: PlantUMLParser;
  private drawioParser: DrawioParser;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    this.plantUMLParser = new PlantUMLParser();
    this.drawioParser = new DrawioParser();
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
   * @param pageSlug 페이지 슬러그 (Draw.io 파일명 생성용)
   * @param fileManager FileManager 인스턴스 (Draw.io 파일 저장용, optional)
   * @returns 변환된 마크다운 문자열
   */
  async convertPage(page: ConfluencePage, pageSlug?: string, fileManager?: FileManager): Promise<string> {
    if (!page.content || page.content.trim() === '') {
      return '';
    }

    try {
      let processedContent = page.content;

      // 1. PlantUML 매크로 추출 및 치환
      const plantUMLMacros = this.plantUMLParser.extractMacros(processedContent);
      if (plantUMLMacros.length > 0) {
        processedContent = this.plantUMLParser.replaceWithPlaceholders(processedContent, plantUMLMacros);
      }

      // 2. Draw.io 매크로 추출 및 파일 저장
      const drawioMacros = this.drawioParser.extractMacros(processedContent);
      const drawioFilenames: string[] = [];

      if (drawioMacros.length > 0 && pageSlug && fileManager) {
        // Draw.io 파일 저장 및 플레이스홀더 치환
        for (let i = 0; i < drawioMacros.length; i++) {
          const filename = this.drawioParser.generateFilename(pageSlug, i);
          await fileManager.writeDrawioFile(filename, drawioMacros[i].xml);
          drawioFilenames.push(filename);
        }
        processedContent = this.drawioParser.replaceWithPlaceholders(processedContent, drawioMacros);
      }

      // 3. Turndown으로 HTML → Markdown 변환
      let markdown = this.turndown.turndown(processedContent);

      // 4. PlantUML 플레이스홀더를 코드 블록으로 복원
      if (plantUMLMacros.length > 0) {
        markdown = this.plantUMLParser.restorePlaceholders(markdown, plantUMLMacros);
      }

      // 5. Draw.io 플레이스홀더를 임베딩 코드로 복원
      if (drawioFilenames.length > 0) {
        markdown = this.drawioParser.restorePlaceholders(markdown, drawioFilenames);
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
