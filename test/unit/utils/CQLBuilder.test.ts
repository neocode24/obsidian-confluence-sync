import { CQLBuilder } from '../../../src/utils/CQLBuilder';
import { SyncFilters } from '../../../src/types/filters';

describe('CQLBuilder', () => {
  let builder: CQLBuilder;

  beforeEach(() => {
    builder = new CQLBuilder();
  });

  describe('buildSearchQuery', () => {
    it('should return default query when no filters provided', () => {
      const query = builder.buildSearchQuery();
      expect(query).toBe('type = page');
    });

    it('should return default query when filters are disabled', () => {
      const filters: SyncFilters = {
        enabled: false,
        spaceKeys: ['SPACE1'],
        labels: ['important'],
        rootPageIds: ['123456789']
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page');
    });

    it('should build query with space filter only', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE1', 'SPACE2'],
        labels: [],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN (SPACE1, SPACE2)');
    });

    it('should build query with label filter only', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: ['important', 'documentation'],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND label IN (important, documentation)');
    });

    it('should build query with page tree filter only', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: ['123456789', '987654321']
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND ancestor IN (123456789, 987654321)');
    });

    it('should build query with multiple filters (space + label)', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE1'],
        labels: ['important'],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN (SPACE1) AND label IN (important)');
    });

    it('should build query with all filters', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE1', 'SPACE2'],
        labels: ['important', 'documentation'],
        rootPageIds: ['123456789']
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN (SPACE1, SPACE2) AND label IN (important, documentation) AND ancestor IN (123456789)');
    });

    it('should handle empty arrays in filters', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page');
    });

    it('should trim whitespace from filter values', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['  SPACE1  ', 'SPACE2  '],
        labels: [],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN (SPACE1, SPACE2)');
    });

    it('should filter out empty strings', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE1', '', '  ', 'SPACE2'],
        labels: [],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN (SPACE1, SPACE2)');
    });

    it('should escape values with special characters', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE WITH SPACES'],
        labels: [],
        rootPageIds: []
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND space IN ("SPACE WITH SPACES")');
    });

    it('should filter out invalid page IDs (non-numeric)', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: ['123456789', 'invalid', '987654321']
      };

      const query = builder.buildSearchQuery(filters);
      expect(query).toBe('type = page AND ancestor IN (123456789, 987654321)');
    });
  });

  describe('validateFilters', () => {
    it('should return true when filters are disabled', () => {
      const filters: SyncFilters = {
        enabled: false,
        spaceKeys: [],
        labels: [],
        rootPageIds: []
      };

      expect(builder.validateFilters(filters)).toBe(true);
    });

    it('should return false when filters are enabled but all empty', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: []
      };

      expect(builder.validateFilters(filters)).toBe(false);
    });

    it('should return true when filters are enabled with at least one filter', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: ['SPACE1'],
        labels: [],
        rootPageIds: []
      };

      expect(builder.validateFilters(filters)).toBe(true);
    });

    it('should return false when page IDs contain invalid values', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: ['123456789', 'invalid-id', '987654321']
      };

      expect(builder.validateFilters(filters)).toBe(false);
    });

    it('should return true when all page IDs are valid', () => {
      const filters: SyncFilters = {
        enabled: true,
        spaceKeys: [],
        labels: [],
        rootPageIds: ['123456789', '987654321']
      };

      expect(builder.validateFilters(filters)).toBe(true);
    });
  });
});
