import { describe, it, expect, beforeEach } from 'vitest';
import { PlantUMLParser, PlantUMLMacro } from '../../../src/converters/PlantUMLParser';

describe('PlantUMLParser', () => {
  let parser: PlantUMLParser;

  beforeEach(() => {
    parser = new PlantUMLParser();
  });

  describe('extractMacros', () => {
    it('should extract PlantUML macro with CDATA', () => {
      const html = `
<ac:structured-macro ac:name="plantuml" ac:schema-version="1">
  <ac:parameter ac:name="title">System Architecture</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi
@enduml
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].title).toBe('System Architecture');
      expect(macros[0].code).toContain('@startuml');
      expect(macros[0].code).toContain('Alice -> Bob');
      expect(macros[0].code).toContain('@enduml');
    });

    it('should extract PlantUML macro without title', () => {
      const html = `
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body>
    <![CDATA[
@startuml
User -> System: Request
@enduml
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].title).toBeUndefined();
      expect(macros[0].code).toContain('@startuml');
    });

    it('should extract multiple PlantUML macros', () => {
      const html = `
<p>First diagram:</p>
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">Diagram 1</ac:parameter>
  <ac:plain-text-body><![CDATA[
@startuml
A -> B
@enduml
  ]]></ac:plain-text-body>
</ac:structured-macro>
<p>Second diagram:</p>
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">Diagram 2</ac:parameter>
  <ac:plain-text-body><![CDATA[
@startuml
C -> D
@enduml
  ]]></ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(2);
      expect(macros[0].title).toBe('Diagram 1');
      expect(macros[0].code).toContain('A -> B');
      expect(macros[1].title).toBe('Diagram 2');
      expect(macros[1].code).toContain('C -> D');
    });

    it('should handle HTML without PlantUML macros', () => {
      const html = '<p>Just regular content</p>';

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(0);
    });

    it('should extract PlantUML without CDATA wrapper', () => {
      const html = `
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body>
@startuml
User -> System
@enduml
  </ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].code).toContain('@startuml');
      expect(macros[0].code).toContain('User -> System');
    });

    it('should store correct start and end indices', () => {
      const html = `
<p>Before</p>
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body><![CDATA[@startuml\nA -> B\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
<p>After</p>
      `;

      const macros = parser.extractMacros(html);

      expect(macros.length).toBe(1);
      expect(macros[0].startIndex).toBeGreaterThan(0);
      expect(macros[0].endIndex).toBeGreaterThan(macros[0].startIndex);
      expect(html.substring(macros[0].startIndex, macros[0].endIndex)).toContain('plantuml');
    });
  });

  describe('convertToMarkdown', () => {
    it('should convert macro to markdown code block', () => {
      const macro: PlantUMLMacro = {
        code: '@startuml\nAlice -> Bob: Hello\n@enduml',
        startIndex: 0,
        endIndex: 100
      };

      const markdown = parser.convertToMarkdown(macro);

      expect(markdown).toContain('```plantuml');
      expect(markdown).toContain('@startuml');
      expect(markdown).toContain('Alice -> Bob: Hello');
      expect(markdown).toContain('@enduml');
      expect(markdown).toContain('```');
    });

    it('should include title as comment when present', () => {
      const macro: PlantUMLMacro = {
        code: '@startuml\nUser -> System\n@enduml',
        title: 'User Flow Diagram',
        startIndex: 0,
        endIndex: 100
      };

      const markdown = parser.convertToMarkdown(macro);

      expect(markdown).toContain('<!-- User Flow Diagram -->');
      expect(markdown).toContain('```plantuml');
    });

    it('should not include comment when title is absent', () => {
      const macro: PlantUMLMacro = {
        code: '@startuml\nA -> B\n@enduml',
        startIndex: 0,
        endIndex: 100
      };

      const markdown = parser.convertToMarkdown(macro);

      expect(markdown).not.toContain('<!--');
      expect(markdown).toMatch(/^```plantuml/);
    });
  });

  describe('replaceWithPlaceholders', () => {
    it('should replace macros with placeholders', () => {
      const html = `
<p>Text before</p>
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body><![CDATA[@startuml\nA -> B\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
<p>Text after</p>
      `;

      const macros = parser.extractMacros(html);
      const result = parser.replaceWithPlaceholders(html, macros);

      expect(result).toContain('<p>__PLANTUML_PLACEHOLDER_0__</p>');
      expect(result).not.toContain('<ac:structured-macro');
      expect(result).toContain('Text before');
      expect(result).toContain('Text after');
    });

    it('should replace multiple macros with indexed placeholders', () => {
      const html = `
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body><![CDATA[@startuml\nA -> B\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
<p>Middle</p>
<ac:structured-macro ac:name="plantuml">
  <ac:plain-text-body><![CDATA[@startuml\nC -> D\n@enduml]]></ac:plain-text-body>
</ac:structured-macro>
      `;

      const macros = parser.extractMacros(html);
      const result = parser.replaceWithPlaceholders(html, macros);

      expect(result).toContain('<p>__PLANTUML_PLACEHOLDER_0__</p>');
      expect(result).toContain('<p>__PLANTUML_PLACEHOLDER_1__</p>');
      expect(result).toContain('Middle');
    });
  });

  describe('restorePlaceholders', () => {
    it('should restore placeholders with code blocks', () => {
      const macros: PlantUMLMacro[] = [
        {
          code: '@startuml\nA -> B\n@enduml',
          startIndex: 0,
          endIndex: 100
        }
      ];

      const markdown = 'Text before \\_\\_PLANTUML\\_PLACEHOLDER\\_0\\_\\_ Text after';
      const result = parser.restorePlaceholders(markdown, macros);

      expect(result).not.toContain('__PLANTUML_PLACEHOLDER_');
      expect(result).toContain('```plantuml');
      expect(result).toContain('@startuml');
      expect(result).toContain('Text before');
      expect(result).toContain('Text after');
    });

    it('should restore multiple placeholders', () => {
      const macros: PlantUMLMacro[] = [
        {
          code: '@startuml\nA -> B\n@enduml',
          title: 'Diagram 1',
          startIndex: 0,
          endIndex: 100
        },
        {
          code: '@startuml\nC -> D\n@enduml',
          title: 'Diagram 2',
          startIndex: 150,
          endIndex: 250
        }
      ];

      const markdown = '\\_\\_PLANTUML\\_PLACEHOLDER\\_0\\_\\_ Middle \\_\\_PLANTUML\\_PLACEHOLDER\\_1\\_\\_';
      const result = parser.restorePlaceholders(markdown, macros);

      expect(result).not.toContain('__PLANTUML_PLACEHOLDER_');
      expect(result).toContain('<!-- Diagram 1 -->');
      expect(result).toContain('<!-- Diagram 2 -->');
      expect(result).toContain('A -> B');
      expect(result).toContain('C -> D');
    });
  });

  describe('integration: extract → replace → restore', () => {
    it('should preserve PlantUML through full conversion cycle', () => {
      const originalHtml = `
<p>Introduction</p>
<ac:structured-macro ac:name="plantuml">
  <ac:parameter ac:name="title">Architecture</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
@startuml
User -> Frontend: Request
Frontend -> Backend: API Call
Backend -> Database: Query
@enduml
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
      expect(htmlWithPlaceholders).toContain('<p>__PLANTUML_PLACEHOLDER_0__</p>');
      expect(htmlWithPlaceholders).not.toContain('ac:structured-macro');

      // 3. Simulate markdown conversion (Turndown escapes underscores)
      // In real scenario, Turndown converts <p>__PLANTUML_PLACEHOLDER_0__</p> to \_\_PLANTUML\_PLACEHOLDER\_0\_\_
      const markdown = '\\_\\_PLANTUML\\_PLACEHOLDER\\_0\\_\\_';

      // 4. Restore code blocks
      const finalMarkdown = parser.restorePlaceholders(markdown, macros);

      expect(finalMarkdown).toContain('<!-- Architecture -->');
      expect(finalMarkdown).toContain('```plantuml');
      expect(finalMarkdown).toContain('User -> Frontend: Request');
      expect(finalMarkdown).toContain('Frontend -> Backend: API Call');
      expect(finalMarkdown).toContain('Backend -> Database: Query');
      expect(finalMarkdown).not.toContain('__PLANTUML_PLACEHOLDER_');
    });
  });
});
