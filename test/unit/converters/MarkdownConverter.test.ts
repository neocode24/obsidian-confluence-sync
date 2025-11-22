import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownConverter } from '../../../src/converters/MarkdownConverter';
import { ConfluencePage } from '../../../src/types/confluence';
import htmlFixtures from '../../fixtures/confluence-page-html.json';

describe('MarkdownConverter', () => {
  let converter: MarkdownConverter;

  beforeEach(() => {
    converter = new MarkdownConverter();
  });

  describe('convertPage', () => {
    it('should convert simple HTML to Markdown', async () => {
      const page: ConfluencePage = {
        id: '123',
        title: 'Test Page',
        spaceKey: 'TEST',
        content: htmlFixtures.simpleHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/123',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('# Sample Page Title');
      expect(markdown).toContain('**sample**');
      expect(markdown).toContain('*emphasis*');
      expect(markdown).toContain('Item 1');
      expect(markdown).toContain('Item 2');
    });

    it('should convert table HTML to Markdown', async () => {
      const page: ConfluencePage = {
        id: '124',
        title: 'Table Page',
        spaceKey: 'TEST',
        content: htmlFixtures.tableHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/124',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('Header 1');
      expect(markdown).toContain('Header 2');
      expect(markdown).toContain('Cell 1');
      expect(markdown).toContain('Cell 2');
      // Turndown은 테이블을 일반 텍스트로 변환할 수 있음
    });

    it('should convert code block HTML to Markdown', async () => {
      const page: ConfluencePage = {
        id: '125',
        title: 'Code Page',
        spaceKey: 'TEST',
        content: htmlFixtures.codeBlockHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/125',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('```');
      expect(markdown).toContain('function hello()');
      expect(markdown).toContain("console.log('Hello World')");
    });

    it('should handle complex HTML with multiple elements', async () => {
      const page: ConfluencePage = {
        id: '126',
        title: 'Complex Page',
        spaceKey: 'TEST',
        content: htmlFixtures.complexHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/126',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('# Architecture Overview');
      expect(markdown).toContain('## Components');
      expect(markdown).toContain('Frontend - React');
      expect(markdown).toContain('```');
      expect(markdown).toContain('const express');
      expect(markdown).toContain('[documentation](https://example.com)');
    });

    it('should return empty string for empty content', async () => {
      const page: ConfluencePage = {
        id: '127',
        title: 'Empty Page',
        spaceKey: 'TEST',
        content: htmlFixtures.emptyHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/127',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toBe('');
    });

    it('should return empty string for whitespace-only content', async () => {
      const page: ConfluencePage = {
        id: '128',
        title: 'Whitespace Page',
        spaceKey: 'TEST',
        content: htmlFixtures.whiteSpaceOnlyHtml,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/128',
        labels: [],
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toBe('');
    });
  });

  describe('convertHtml', () => {
    it('should convert HTML string directly', () => {
      const html = '<h1>Direct Conversion</h1><p>Test paragraph</p>';
      const markdown = converter.convertHtml(html);

      expect(markdown).toContain('# Direct Conversion');
      expect(markdown).toContain('Test paragraph');
    });

    it('should handle empty HTML string', () => {
      const markdown = converter.convertHtml('');
      expect(markdown).toBe('');
    });

    it('should handle special characters', () => {
      const html = '<p>Special chars: &lt; &gt; &amp;</p>';
      const markdown = converter.convertHtml(html);

      expect(markdown).toContain('Special chars: < > &');
    });
  });

  describe('PlantUML macro handling', () => {
    it('should convert PlantUML macro to markdown code block', async () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Page with PlantUML',
        spaceKey: 'TEST',
        content: `
<p>Introduction</p>
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">System Diagram</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi
@enduml
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
<p>Conclusion</p>
        `,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('<!-- System Diagram -->');
      expect(markdown).toContain('```plantuml');
      expect(markdown).toContain('Alice -> Bob: Hello');
      expect(markdown).toContain('Bob -> Alice: Hi');
      expect(markdown).toContain('@startuml');
      expect(markdown).toContain('@enduml');
      expect(markdown).toContain('Introduction');
      expect(markdown).toContain('Conclusion');
    });

    it('should handle multiple PlantUML macros', async () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'Multiple Diagrams',
        spaceKey: 'TEST',
        content: `
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">Diagram 1</ac:parameter>
  <ac:plain-text-body><![CDATA[@startuml\nA -> B\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
<p>Middle content</p>
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">Diagram 2</ac:parameter>
  <ac:plain-text-body><![CDATA[@startuml\nC -> D\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
        `,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toContain('<!-- Diagram 1 -->');
      expect(markdown).toContain('<!-- Diagram 2 -->');
      expect(markdown).toContain('A -> B');
      expect(markdown).toContain('C -> D');
      const matches = markdown.match(/```plantuml/g);
      expect(matches).toHaveLength(2);
    });

    it('should convert PlantUML without title', async () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'No Title Diagram',
        spaceKey: 'TEST',
        content: `
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body><![CDATA[
@startuml
User -> System: Request
@enduml
  ]]></ac:plain-text-body>
</ac:structured-macro>
        `,
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).not.toContain('<!--');
      expect(markdown).toContain('```plantuml');
      expect(markdown).toContain('User -> System: Request');
    });

    it('should handle page with no PlantUML macros', async () => {
      const page: ConfluencePage = {
        id: '12345',
        title: 'No Diagrams',
        spaceKey: 'TEST',
        content: '<p>Just regular text</p>',
        version: 1,
        lastModified: '2025-11-22T00:00:00Z',
        author: 'test@example.com',
        url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/12345',
        labels: []
      };

      const markdown = await converter.convertPage(page);

      expect(markdown).toBe('Just regular text');
      expect(markdown).not.toContain('```plantuml');
    });
  });
});
