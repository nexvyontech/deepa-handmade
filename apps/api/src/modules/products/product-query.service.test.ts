import { escapeRegExp, paginationMeta, productListQuery, sortFor } from './product-query.service.js';

describe('product-query helpers', () => {
  describe('escapeRegExp', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeRegExp('100% cotton [plus].*')).toBe('100% cotton \\[plus\\]\\.\\*');
    });
  });

  describe('sortFor', () => {
    it('maps known sort keys to mongo sort objects', () => {
      expect(sortFor('price_asc')).toEqual({ basePrice: 1, _id: 1 });
      expect(sortFor('newest')).toEqual({ createdAt: -1, _id: -1 });
      expect(sortFor('featured')).toEqual({ featured: -1, createdAt: -1, _id: -1 });
    });
  });

  describe('productListQuery', () => {
    it('applies a plain ACTIVE filter by default', () => {
      expect(productListQuery({ status: 'ACTIVE' })).toEqual({ status: 'ACTIVE' });
    });

    it('combines search, category, price and featured filters', () => {
      const query = productListQuery({
        status: 'ACTIVE',
        search: 'silk sari',
        categoryIds: ['a', 'b'],
        priceMin: 500,
        priceMax: 5000,
        featured: true,
      });
      expect(query).toEqual({
        status: 'ACTIVE',
        searchText: { $regex: 'silk sari', $options: 'i' },
        categoryId: { $in: ['a', 'b'] },
        basePrice: { $gte: 500, $lte: 5000 },
        featured: true,
      });
    });

    it('applies the productIds restriction when option filters matched', () => {
      const query = productListQuery({ status: 'ACTIVE', productIds: ['x'] });
      expect(query._id).toEqual({ $in: ['x'] });
    });
  });

  describe('paginationMeta', () => {
    it('computes page totals and rounds up totalPages', () => {
      expect(paginationMeta(45, 2, 20)).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
      expect(paginationMeta(0, 1, 20).totalPages).toBe(1);
    });
  });
});