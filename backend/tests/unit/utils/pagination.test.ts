import {
  getPaginationParams,
  paginate,
  parsePaginationQuery,
} from '@shared/utils/pagination';

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should calculate skip and take for page 1', () => {
      const result = getPaginationParams({ page: 1, limit: 20 });

      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should calculate skip and take for page 3', () => {
      const result = getPaginationParams({ page: 3, limit: 20 });

      expect(result.skip).toBe(40);
      expect(result.take).toBe(20);
    });

    it('should handle custom limit', () => {
      const result = getPaginationParams({ page: 2, limit: 50 });

      expect(result.skip).toBe(50);
      expect(result.take).toBe(50);
    });
  });

  describe('paginate', () => {
    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = paginate(data, 100, { page: 1, limit: 20 });

      expect(result.data).toEqual(data);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(5);
    });

    it('should calculate total pages correctly', () => {
      const data = [{ id: 1 }];

      expect(paginate(data, 100, { page: 1, limit: 20 }).totalPages).toBe(5);
      expect(paginate(data, 101, { page: 1, limit: 20 }).totalPages).toBe(6);
      expect(paginate(data, 20, { page: 1, limit: 20 }).totalPages).toBe(1);
      expect(paginate(data, 0, { page: 1, limit: 20 }).totalPages).toBe(0);
    });
  });

  describe('parsePaginationQuery', () => {
    it('should parse pagination query with defaults', () => {
      const result = parsePaginationQuery({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.order).toBe('desc');
    });

    it('should parse provided values', () => {
      const result = parsePaginationQuery({
        page: '3',
        limit: '50',
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.sort).toBe('createdAt');
      expect(result.order).toBe('asc');
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePaginationQuery({ page: '-5' });

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const result = parsePaginationQuery({ limit: '500' });

      expect(result.limit).toBe(100);
    });

    it('should default order to desc for invalid value', () => {
      const result = parsePaginationQuery({ order: 'invalid' });

      expect(result.order).toBe('desc');
    });
  });
});
