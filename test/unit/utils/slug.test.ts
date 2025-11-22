import { describe, it, expect } from 'vitest';
import { generateSlug } from '../../../src/utils/slug';

describe('generateSlug', () => {
  it('should convert English title to lowercase slug', () => {
    const slug = generateSlug('API Design Guide');
    expect(slug).toBe('api-design-guide');
  });

  it('should convert Korean title to slug', () => {
    const slug = generateSlug('API 설계 가이드');
    // slugify strict mode removes non-ASCII characters
    expect(slug).toBe('api');
  });

  it('should remove special characters', () => {
    const slug = generateSlug('Test: Special "Characters" & More!');
    expect(slug).toBe('test-special-characters-and-more');
  });

  it('should handle mixed Korean and English', () => {
    const slug = generateSlug('Architecture Overview 아키텍처');
    // slugify strict mode removes non-ASCII characters
    expect(slug).toBe('architecture-overview');
  });

  it('should truncate long titles', () => {
    const longTitle = 'A'.repeat(250);
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(200);
  });

  it('should return "untitled" for empty string', () => {
    const slug = generateSlug('');
    expect(slug).toBe('untitled');
  });

  it('should return "untitled" for whitespace-only string', () => {
    const slug = generateSlug('   ');
    expect(slug).toBe('untitled');
  });

  it('should handle titles with only special characters', () => {
    const slug = generateSlug('***!!!@@@');
    expect(slug).toBe('untitled');
  });

  it('should handle numbers in title', () => {
    const slug = generateSlug('Story 1.5: File Naming');
    // Dot is removed, resulting in "15"
    expect(slug).toBe('story-15-file-naming');
  });

  it('should handle underscores and hyphens', () => {
    const slug = generateSlug('my_file-name_test');
    // Underscores are removed in strict mode
    expect(slug).toBe('myfile-nametest');
  });
});
