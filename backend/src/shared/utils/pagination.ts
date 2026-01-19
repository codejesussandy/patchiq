import { PaginationParams, PaginatedResponse } from '@shared/types';

export function getPaginationParams(params: PaginationParams) {
  const { page, limit } = params;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginate<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  const { page, limit } = params;
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function parsePaginationQuery(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const sort = query.sort as string | undefined;
  const order = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  return { page, limit, sort, order };
}
