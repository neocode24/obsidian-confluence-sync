import { PageLinkTransformer } from '../../../src/converters/PageLinkTransformer';

describe('PageLinkTransformer', () => {
  let transformer: PageLinkTransformer;

  beforeEach(() => {
    transformer = new PageLinkTransformer();
  });

  describe('extractPageLinks', () => {
    it('should extract Confluence page links from HTML', () => {
      const html = `
        <a href="/wiki/spaces/SPACE/pages/123456789/Page+Title">Link 1</a>
        <a href="/wiki/pages/987654321">Link 2</a>
        <a href="https://site.atlassian.net/wiki/spaces/TEST/pages/111222333/Test">Link 3</a>
      `;

      const result = transformer.extractPageLinks(html);

      expect(result.size).toBe(3);
      expect(result.has('123456789')).toBe(true);
      expect(result.has('987654321')).toBe(true);
      expect(result.has('111222333')).toBe(true);
    });

    it('should handle HTML with no Confluence links', () => {
      const html = `
        <a href="https://google.com">External Link</a>
        <a href="/other/path">Other Link</a>
      `;

      const result = transformer.extractPageLinks(html);

      expect(result.size).toBe(0);
    });

    it('should extract links with anchors', () => {
      const html = `
        <a href="/wiki/spaces/SPACE/pages/123456789#anchor">Link with anchor</a>
      `;

      const result = transformer.extractPageLinks(html);

      expect(result.size).toBe(1);
      expect(result.has('123456789')).toBe(true);
    });
  });

  describe('transformLinks', () => {
    it('should convert Confluence links to simple wikilinks when text matches filename', () => {
      const markdown = '[page-title](/wiki/spaces/SPACE/pages/123456789/Page+Title)';
      const pageIdToFileMap = new Map([['123456789', 'page-title.md']]);

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toBe('[[page-title]]');
    });

    it('should convert Confluence links to aliased wikilinks when text differs from filename', () => {
      const markdown = '[Custom Text](/wiki/spaces/SPACE/pages/123456789/Page+Title)';
      const pageIdToFileMap = new Map([['123456789', 'page-title.md']]);

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toBe('[[page-title|Custom Text]]');
    });

    it('should add TODO comment for unsynced pages', () => {
      const markdown = '[Unsynced Page](/wiki/spaces/SPACE/pages/999999999/Unsynced)';
      const pageIdToFileMap = new Map<string, string>();

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toContain('[Unsynced Page](/wiki/spaces/SPACE/pages/999999999/Unsynced)');
      expect(result).toContain('<!-- TODO: Link to unsynced page (ID: 999999999) -->');
    });

    it('should handle multiple links in markdown', () => {
      const markdown = `
        [Page 1](/wiki/spaces/SPACE/pages/111/Page1)
        [Page 2](/wiki/spaces/SPACE/pages/222/Page2)
        [Unsynced](/wiki/spaces/SPACE/pages/333/Unsynced)
      `;
      const pageIdToFileMap = new Map([
        ['111', 'page-1.md'],
        ['222', 'page-2.md'],
      ]);

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toContain('[[page-1]]');
      expect(result).toContain('[[page-2]]');
      expect(result).toContain('<!-- TODO: Link to unsynced page (ID: 333) -->');
    });

    it('should handle short format Confluence links', () => {
      const markdown = '[Short Link](/wiki/pages/123456789)';
      const pageIdToFileMap = new Map([['123456789', 'short-link.md']]);

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toBe('[[short-link|Short Link]]');
    });

    it('should preserve markdown without Confluence links', () => {
      const markdown = `
        [External Link](https://google.com)
        [Relative Link](./other.md)
        Some text without links.
      `;
      const pageIdToFileMap = new Map<string, string>();

      const result = transformer.transformLinks(markdown, pageIdToFileMap);

      expect(result).toBe(markdown);
    });
  });

  describe('isExternalLink', () => {
    it('should identify external links', () => {
      expect(transformer.isExternalLink('https://google.com')).toBe(true);
      expect(transformer.isExternalLink('/other/path')).toBe(true);
      expect(transformer.isExternalLink('mailto:test@example.com')).toBe(true);
    });

    it('should identify Confluence page links as internal', () => {
      expect(transformer.isExternalLink('/wiki/spaces/SPACE/pages/123/Page')).toBe(false);
      expect(transformer.isExternalLink('/wiki/pages/123')).toBe(false);
    });
  });
});
