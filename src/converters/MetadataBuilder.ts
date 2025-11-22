import * as yaml from 'js-yaml';
import { ConfluencePage } from '../types/confluence';

/**
 * YAML Frontmatter 메타데이터 인터페이스
 */
export interface FileFrontmatter {
  title: string;
  confluence_id: string;
  confluence_space: string;
  confluence_url: string;
  author: string;
  created: string;
  updated: string;
  tags: string[];
}

/**
 * Confluence 페이지 메타데이터를 YAML Frontmatter로 생성
 */
export class MetadataBuilder {
  /**
   * Confluence 페이지로부터 YAML Frontmatter 생성
   * @param page Confluence 페이지 객체
   * @returns YAML Frontmatter 문자열 (구분선 포함)
   */
  buildFrontmatter(page: ConfluencePage): string {
    const frontmatter: FileFrontmatter = {
      title: page.title,
      confluence_id: page.id,
      confluence_space: page.spaceKey,
      confluence_url: page.url,
      author: page.author,
      created: page.lastModified, // Confluence API v2는 created 필드가 없을 수 있어 lastModified 사용
      updated: page.lastModified,
      tags: page.labels || [],
    };

    return this.serializeFrontmatter(frontmatter);
  }

  /**
   * Frontmatter 객체를 YAML 문자열로 직렬화
   * @param frontmatter Frontmatter 객체
   * @returns YAML 문자열 (구분선 포함: ---\n...yaml...\n---)
   */
  private serializeFrontmatter(frontmatter: FileFrontmatter): string {
    try {
      const yamlString = yaml.dump(frontmatter, {
        indent: 2,
        lineWidth: -1, // 줄바꿈 없이 한 줄로
        noRefs: true,
        sortKeys: false, // 정의 순서 유지
      });

      return `---\n${yamlString}---`;
    } catch (error) {
      console.error('[MetadataBuilder] Failed to serialize frontmatter:', error);
      throw new Error(`Frontmatter serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Frontmatter와 마크다운 본문을 결합
   * @param frontmatter YAML Frontmatter 문자열
   * @param markdown 마크다운 본문
   * @returns 최종 파일 콘텐츠
   */
  combineContent(frontmatter: string, markdown: string): string {
    return `${frontmatter}\n\n${markdown}\n`;
  }
}
