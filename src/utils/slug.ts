import slugify from 'slugify';

/**
 * Confluence 페이지 제목을 URL-safe 파일명으로 변환
 * @param title Confluence 페이지 제목
 * @returns URL-safe slug (파일명으로 사용 가능)
 */
export function generateSlug(title: string): string {
  if (!title || title.trim() === '') {
    return 'untitled';
  }

  const slug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'ko',
    remove: /[*+~.()'"!:@]/g,
  });

  // 빈 결과 처리 (모든 문자가 제거된 경우)
  if (slug === '') {
    return 'untitled';
  }

  // 최대 길이 제한 (파일시스템 제약)
  const MAX_LENGTH = 200; // .md 확장자를 위한 여유 공간
  if (slug.length > MAX_LENGTH) {
    return slug.substring(0, MAX_LENGTH);
  }

  return slug;
}
