import { describe, it, expect } from 'vitest';
import {
	parseFileContent,
	extractFrontmatter,
	CONFLUENCE_START_MARKER,
	CONFLUENCE_END_MARKER
} from '../../../src/utils/ContentRegionParser';

describe('ContentRegionParser', () => {
	describe('parseFileContent', () => {
		it('should parse content with markers correctly', () => {
			const content = `---
title: Test Page
---

${CONFLUENCE_START_MARKER}
# Test Content

This is Confluence content.
${CONFLUENCE_END_MARKER}

## Local Notes
My personal notes here.

## Backlinks
- [[Related Page]]`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(true);
			expect(result.confluenceContent).toBe('# Test Content\n\nThis is Confluence content.');
			expect(result.localNotes).toContain('## Local Notes');
			expect(result.localNotes).toContain('## Backlinks');
		});

		it('should handle content without markers', () => {
			const content = `---
title: Test Page
---

# Test Content

No markers here.`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(false);
			expect(result.confluenceContent).toBe(content);
			expect(result.localNotes).toBe('');
		});

		it('should handle empty local notes section', () => {
			const content = `---
title: Test Page
---

${CONFLUENCE_START_MARKER}
# Test Content
${CONFLUENCE_END_MARKER}`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(true);
			expect(result.confluenceContent).toBe('# Test Content');
			expect(result.localNotes).toBe('');
		});

		it('should handle incomplete markers (only start)', () => {
			const content = `---
title: Test Page
---

${CONFLUENCE_START_MARKER}
# Test Content

No end marker.`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(false);
			expect(result.confluenceContent).toBe(content);
			expect(result.localNotes).toBe('');
		});

		it('should handle incomplete markers (only end)', () => {
			const content = `---
title: Test Page
---

# Test Content
${CONFLUENCE_END_MARKER}

No start marker.`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(false);
			expect(result.confluenceContent).toBe(content);
			expect(result.localNotes).toBe('');
		});

		it('should handle reversed markers (end before start)', () => {
			const content = `---
title: Test Page
---

${CONFLUENCE_END_MARKER}
# Test Content
${CONFLUENCE_START_MARKER}

Reversed markers.`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(false);
			expect(result.confluenceContent).toBe(content);
			expect(result.localNotes).toBe('');
		});

		it('should preserve whitespace in local notes', () => {
			const content = `${CONFLUENCE_START_MARKER}
Content
${CONFLUENCE_END_MARKER}

## Local Notes

- Note 1
- Note 2

## Tags
#tag1 #tag2`;

			const result = parseFileContent(content);

			expect(result.hasMarkers).toBe(true);
			expect(result.localNotes).toContain('## Local Notes');
			expect(result.localNotes).toContain('- Note 1');
			expect(result.localNotes).toContain('## Tags');
		});
	});

	describe('extractFrontmatter', () => {
		it('should extract frontmatter correctly', () => {
			const content = `---
title: Test
id: 123
---

# Content here`;

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toContain('---');
			expect(result.frontmatter).toContain('title: Test');
			expect(result.body).toBe('\n# Content here');
		});

		it('should handle content without frontmatter', () => {
			const content = '# Just content\n\nNo frontmatter.';

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toBe('');
			expect(result.body).toBe(content);
		});

		it('should handle empty frontmatter', () => {
			const content = `---
---

# Content`;

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toBe('---\n---\n');
			expect(result.body).toBe('\n# Content');
		});
	});
});
