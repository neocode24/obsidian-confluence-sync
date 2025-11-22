import { describe, it, expect, beforeEach } from 'vitest';
import { DrawioParser, DrawioMacro } from '../../../src/converters/DrawioParser';

describe('DrawioParser', () => {
  let parser: DrawioParser;

  beforeEach(() => {
    parser = new DrawioParser();
  });

  describe('extractMacros', () => {
    it('should extract Draw.io macro with CDATA', () => {
      const html = `
<ac:structured-macro ac:name="drawio" ac:schema-version="1">
  <ac:parameter ac:name="name">System Architecture</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
<mxfile>
  <diagram>Test Diagram</diagram>
</mxfile>
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].name).toBe('System Architecture');
      expect(macros[0].xml).toContain('<mxfile>');
      expect(macros[0].xml).toContain('Test Diagram');
    });

    it('should extract Draw.io macro without name', () => {
      const html = `
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body>
    <![CDATA[
<mxfile>
  <diagram>Unnamed Diagram</diagram>
</mxfile>
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].name).toBeUndefined();
      expect(macros[0].xml).toContain('<mxfile>');
    });

    it('should extract multiple Draw.io macros', () => {
      const html = `
<p>First diagram:</p>
<ac:structured-macro ac:name="drawio">
  <ac:parameter ac:name="name">Diagram 1</ac:parameter>
  <ac:plain-text-body><![CDATA[
<mxfile><diagram>Diagram 1 Content</diagram></mxfile>
  ]]></ac:plain-text-body>
</ac:structured-macro>
<p>Second diagram:</p>
<ac:structured-macro ac:name="drawio">
  <ac:parameter ac:name="name">Diagram 2</ac:parameter>
  <ac:plain-text-body><![CDATA[
<mxfile><diagram>Diagram 2 Content</diagram></mxfile>
  ]]></ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(2);
      expect(macros[0].name).toBe('Diagram 1');
      expect(macros[0].xml).toContain('Diagram 1 Content');
      expect(macros[1].name).toBe('Diagram 2');
      expect(macros[1].xml).toContain('Diagram 2 Content');
    });

    it('should handle HTML without Draw.io macros', () => {
      const html = '<p>Just regular content</p>';

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(0);
    });

    it('should extract Draw.io without CDATA wrapper', () => {
      const html = `
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body>
<mxfile>
  <diagram>Plain Text Diagram</diagram>
</mxfile>
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].xml).toContain('<mxfile>');
      expect(macros[0].xml).toContain('Plain Text Diagram');
    });

    it('should store correct start and end indices', () => {
      const html = `
<p>Before</p>
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body><![CDATA[<mxfile><diagram>Test</diagram></mxfile>]]></ac:plain-text-body>
</ac:structured-macro>
<p>After</p>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].startIndex).toBeGreaterThan(0);
      expect(macros[0].endIndex).toBeGreaterThan(macros[0].startIndex);
      expect(html.substring(macros[0].startIndex, macros[0].endIndex)).toContain('drawio');
    });
  });

  describe('generateFilename', () => {
    it('should generate correct filename', () => {
      const filename = parser.generateFilename('system-architecture', 0);
      expect(filename).toBe('system-architecture-diagram-0.drawio');
    });

    it('should generate filename with index', () => {
      const filename1 = parser.generateFilename('user-guide', 0);
      const filename2 = parser.generateFilename('user-guide', 1);
      const filename3 = parser.generateFilename('user-guide', 2);

      expect(filename1).toBe('user-guide-diagram-0.drawio');
      expect(filename2).toBe('user-guide-diagram-1.drawio');
      expect(filename3).toBe('user-guide-diagram-2.drawio');
    });
  });

  describe('replaceWithPlaceholders', () => {
    it('should replace macros with placeholders', () => {
      const html = `
<p>Text before</p>
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body><![CDATA[<mxfile><diagram>Test</diagram></mxfile>]]></ac:plain-text-body>
</ac:structured-macro>
<p>Text after</p>
      `;

      const macros = parser.extractMacros(html);
      const result = parser.replaceWithPlaceholders(html, macros);

      expect(result).toContain('<p>__DRAWIO_PLACEHOLDER_0__</p>');
      expect(result).not.toContain('<ac:structured-macro');
      expect(result).toContain('Text before');
      expect(result).toContain('Text after');
    });

    it('should replace multiple macros with indexed placeholders', () => {
      const html = `
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body><![CDATA[<mxfile><diagram>A</diagram></mxfile>]]></ac:plain-text-body>
</ac:structured-macro>
<p>Middle</p>
<ac:structured-macro ac:name="drawio">
  <ac:plain-text-body><![CDATA[<mxfile><diagram>B</diagram></mxfile>]]></ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);
      const result = parser.replaceWithPlaceholders(html, macros);

      expect(result).toContain('<p>__DRAWIO_PLACEHOLDER_0__</p>');
      expect(result).toContain('<p>__DRAWIO_PLACEHOLDER_1__</p>');
      expect(result).toContain('Middle');
    });
  });

  describe('restorePlaceholders', () => {
    it('should restore placeholders with embedding code', () => {
      const filenames = ['system-diagram-0.drawio'];

      const markdown = 'Text before \\_\\_DRAWIO\\_PLACEHOLDER\\_0\\_\\_ Text after';
      const result = parser.restorePlaceholders(markdown, filenames);

      expect(result).not.toContain('__DRAWIO_PLACEHOLDER_');
      expect(result).toContain('![[system-diagram-0.drawio]]');
      expect(result).toContain('Text before');
      expect(result).toContain('Text after');
    });

    it('should restore multiple placeholders', () => {
      const filenames = [
        'user-guide-diagram-0.drawio',
        'user-guide-diagram-1.drawio'
      ];

      const markdown = '\\_\\_DRAWIO\\_PLACEHOLDER\\_0\\_\\_ Middle \\_\\_DRAWIO\\_PLACEHOLDER\\_1\\_\\_';
      const result = parser.restorePlaceholders(markdown, filenames);

      expect(result).not.toContain('__DRAWIO_PLACEHOLDER_');
      expect(result).toContain('![[user-guide-diagram-0.drawio]]');
      expect(result).toContain('![[user-guide-diagram-1.drawio]]');
      expect(result).toContain('Middle');
    });
  });

  describe('integration: extract → replace → restore', () => {
    it('should preserve Draw.io through full conversion cycle', () => {
      const originalHtml = `
<p>Introduction</p>
<ac:structured-macro ac:name="drawio">
  <ac:parameter ac:name="name">Architecture</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
<mxfile>
  <diagram>System Architecture Diagram</diagram>
</mxfile>
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
<p>Conclusion</p>
      `;

      // 1. Extract
      const macros = parser.extractMacros(originalHtml);
      expect(macros.length).toBe(1);

      // 2. Replace with placeholders
      const htmlWithPlaceholders = parser.replaceWithPlaceholders(originalHtml, macros);
      expect(htmlWithPlaceholders).toContain('<p>__DRAWIO_PLACEHOLDER_0__</p>');
      expect(htmlWithPlaceholders).not.toContain('ac:structured-macro');

      // 3. Simulate markdown conversion (Turndown escapes underscores)
      const markdown = '\\_\\_DRAWIO\\_PLACEHOLDER\\_0\\_\\_';

      // 4. Restore embeddings
      const filenames = ['page-diagram-0.drawio'];
      const finalMarkdown = parser.restorePlaceholders(markdown, filenames);

      expect(finalMarkdown).toContain('![[page-diagram-0.drawio]]');
      expect(finalMarkdown).not.toContain('__DRAWIO_PLACEHOLDER_');
    });
  });
});
