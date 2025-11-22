import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataBuilder } from '../../../src/converters/MetadataBuilder';
import { ConfluencePage } from '../../../src/types/confluence';
import * as yaml from 'js-yaml';

describe('MetadataBuilder', () => {
  let builder: MetadataBuilder;

  beforeEach(() => {
    builder = new MetadataBuilder();
  });

  describe('buildFrontmatter', () => {
    it('should generate valid YAML frontmatter from Confluence page', () => {
      const page: ConfluencePage = {
        id: '123456',
        title: 'Test API Documentation',
        spaceKey: 'DEV',
        content: '<p>Some content</p>',
        version: 5,
        lastModified: '2025-11-22T10:30:00Z',
        author: 'john.doe@example.com',
        url: 'https://example.atlassian.net/wiki/spaces/DEV/pages/123456',
        labels: ['api', 'documentation', 'backend'],
      };

      const frontmatter = builder.buildFrontmatter(page);

      // 구분선 확인
      expect(frontmatter).toMatch(/^---\n/);
      expect(frontmatter).toMatch(/\n---$/);

      // YAML 파싱 검증
      const yamlContent = frontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
      const parsed = yaml.load(yamlContent) as any;

      expect(parsed.title).toBe('Test API Documentation');
      expect(parsed.confluence_id).toBe('123456');
      expect(parsed.confluence_space).toBe('DEV');
      expect(parsed.confluence_url).toBe('https://example.atlassian.net/wiki/spaces/DEV/pages/123456');
      expect(parsed.author).toBe('john.doe@example.com');
      expect(parsed.created).toBe('2025-11-22T10:30:00Z');
      expect(parsed.updated).toBe('2025-11-22T10:30:00Z');
      expect(parsed.tags).toEqual(['api', 'documentation', 'backend']);
    });

    it('should handle page with empty labels', () => {
      const page: ConfluencePage = {
        id: '789',
        title: 'Empty Labels Page',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/789',
        labels: [],
      };

      const frontmatter = builder.buildFrontmatter(page);
      const yamlContent = frontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
      const parsed = yaml.load(yamlContent) as any;

      expect(parsed.tags).toEqual([]);
    });

    it('should handle special characters in title', () => {
      const page: ConfluencePage = {
        id: '999',
        title: 'Test: Special "Characters" & More',
        spaceKey: 'TEST',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/999',
        labels: [],
      };

      const frontmatter = builder.buildFrontmatter(page);
      const yamlContent = frontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
      const parsed = yaml.load(yamlContent) as any;

      expect(parsed.title).toBe('Test: Special "Characters" & More');
    });

    it('should include all required frontmatter fields', () => {
      const page: ConfluencePage = {
        id: '111',
        title: 'Required Fields Test',
        spaceKey: 'REQ',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'author@example.com',
        url: 'https://example.atlassian.net/wiki/spaces/REQ/pages/111',
        labels: ['test'],
      };

      const frontmatter = builder.buildFrontmatter(page);
      const yamlContent = frontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
      const parsed = yaml.load(yamlContent) as any;

      // 모든 필수 필드 존재 확인
      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('confluence_id');
      expect(parsed).toHaveProperty('confluence_space');
      expect(parsed).toHaveProperty('confluence_url');
      expect(parsed).toHaveProperty('author');
      expect(parsed).toHaveProperty('created');
      expect(parsed).toHaveProperty('updated');
      expect(parsed).toHaveProperty('tags');
    });

    it('should generate valid YAML syntax', () => {
      const page: ConfluencePage = {
        id: '222',
        title: 'YAML Syntax Test',
        spaceKey: 'YAML',
        content: '<p>Content</p>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'yaml@example.com',
        url: 'https://example.atlassian.net/wiki/spaces/YAML/pages/222',
        labels: ['yaml', 'test'],
      };

      const frontmatter = builder.buildFrontmatter(page);

      // YAML 파싱이 오류 없이 성공해야 함
      expect(() => {
        const yamlContent = frontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
        yaml.load(yamlContent);
      }).not.toThrow();
    });
  });

  describe('combineContent', () => {
    it('should combine frontmatter and markdown content', () => {
      const frontmatter = '---\ntitle: Test\n---';
      const markdown = '# Heading\n\nParagraph';

      const combined = builder.combineContent(frontmatter, markdown);

      expect(combined).toBe('---\ntitle: Test\n---\n\n# Heading\n\nParagraph\n');
    });

    it('should add proper spacing between frontmatter and content', () => {
      const frontmatter = '---\ntitle: Test\n---';
      const markdown = 'Content';

      const combined = builder.combineContent(frontmatter, markdown);

      expect(combined).toContain('---\n\nContent');
    });

    it('should handle empty markdown content', () => {
      const frontmatter = '---\ntitle: Test\n---';
      const markdown = '';

      const combined = builder.combineContent(frontmatter, markdown);

      expect(combined).toBe('---\ntitle: Test\n---\n\n\n');
    });
  });
});
