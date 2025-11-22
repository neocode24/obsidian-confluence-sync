/**
 * ContentRegionParser - Confluence 원본 영역과 로컬 메모 영역을 분리하는 파서
 */

export const CONFLUENCE_START_MARKER = '<!-- CONFLUENCE_START -->';
export const CONFLUENCE_END_MARKER = '<!-- CONFLUENCE_END -->';

export interface ParsedContent {
	confluenceContent: string;
	localNotes: string;
	hasMarkers: boolean;
}

/**
 * 파일 콘텐츠를 Confluence 영역과 로컬 메모 영역으로 분리
 * @param content 전체 파일 콘텐츠 (frontmatter 포함)
 * @returns ParsedContent 객체
 */
export function parseFileContent(content: string): ParsedContent {
	// 마커 존재 여부 확인
	const hasStartMarker = content.includes(CONFLUENCE_START_MARKER);
	const hasEndMarker = content.includes(CONFLUENCE_END_MARKER);

	// 마커가 없는 경우 - 전체를 Confluence 콘텐츠로 간주
	if (!hasStartMarker || !hasEndMarker) {
		return {
			confluenceContent: content,
			localNotes: '',
			hasMarkers: false
		};
	}

	// 마커 위치 찾기
	const startIndex = content.indexOf(CONFLUENCE_START_MARKER);
	const endIndex = content.indexOf(CONFLUENCE_END_MARKER);

	// 불완전한 마커 (시작만 있거나, 끝만 있거나, 순서가 잘못된 경우)
	if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
		return {
			confluenceContent: content,
			localNotes: '',
			hasMarkers: false
		};
	}

	// Frontmatter + 마커 이전 부분
	const beforeMarker = content.substring(0, startIndex);

	// Confluence 콘텐츠 (마커 사이)
	const confluenceSection = content.substring(
		startIndex + CONFLUENCE_START_MARKER.length,
		endIndex
	).trim();

	// 로컬 메모 (마커 이후)
	const afterMarker = content.substring(endIndex + CONFLUENCE_END_MARKER.length).trim();

	return {
		confluenceContent: confluenceSection,
		localNotes: afterMarker,
		hasMarkers: true
	};
}

/**
 * Frontmatter를 파일 콘텐츠에서 추출
 * @param content 전체 파일 콘텐츠
 * @returns { frontmatter: string, body: string }
 */
export function extractFrontmatter(content: string): { frontmatter: string; body: string } {
	// Match frontmatter with optional content between delimiters
	const frontmatterRegex = /^---\r?\n([\s\S]*?)---\r?\n/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return {
			frontmatter: '',
			body: content
		};
	}

	const frontmatter = match[0]; // Includes --- delimiters
	const body = content.substring(frontmatter.length);

	return {
		frontmatter,
		body
	};
}
