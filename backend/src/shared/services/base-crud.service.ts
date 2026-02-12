import { NotFoundError, ConflictError } from '@shared/errors';
import { createLogger, type Logger } from '@shared/services/logger';
import { withTransaction, type TransactionClient } from '@shared/utils/transaction';
import { prisma } from '@/db/client';

// ============================================
// Types
// ============================================

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<TResponse> {
  data: TResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseCrudConfig {
  /** Prisma model name (e.g. 'category', 'tag') — used to access prisma[modelName] */
  modelName: string;
  /** Human-readable entity name for error messages (e.g. 'Category', 'Tag') */
  entityName: string;
  /** Default include relations for findById and findMany */
  defaultInclude?: Record<string, unknown>;
  /** Default orderBy clause */
  defaultOrderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  /** Fields to search when a `search` query param is provided */
  searchFields?: string[];
  /** Default page size */
  defaultLimit?: number;
}

// Prisma delegate type — any model delegate that has the standard CRUD methods
type PrismaDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  count(args?: unknown): Promise<number>;
};

// ============================================
// BaseCrudService
// ============================================

export abstract class BaseCrudService<
  TModel,
  TCreateInput,
  TUpdateInput,
  TResponse,
  TListQuery extends ListQuery = ListQuery,
> {
  protected readonly logger: Logger;
  protected readonly config: BaseCrudConfig;

  constructor(config: BaseCrudConfig) {
    this.config = config;
    this.logger = createLogger(config.modelName);
  }

  /** Access the Prisma delegate for this model */
  protected get delegate(): PrismaDelegate {
    return (prisma as unknown as Record<string, PrismaDelegate>)[this.config.modelName];
  }

  /** Get delegate from a transaction client */
  protected txDelegate(tx: TransactionClient): PrismaDelegate {
    return (tx as unknown as Record<string, PrismaDelegate>)[this.config.modelName];
  }

  // ============================================
  // Abstract methods — subclasses must implement
  // ============================================

  /** Transform a Prisma model into the API response shape */
  protected abstract transform(model: TModel): TResponse;

  // ============================================
  // Built-in helpers
  // ============================================

  /**
   * Find a record by ID or throw NotFoundError.
   * Returns the raw Prisma model (not transformed).
   */
  async ensureExists(id: string, include?: Record<string, unknown>): Promise<TModel> {
    const record = await this.delegate.findUnique({
      where: { id },
      ...(include || this.config.defaultInclude ? { include: include ?? this.config.defaultInclude } : {}),
    });

    if (!record) {
      throw new NotFoundError(`${this.config.entityName} not found`);
    }

    return record as TModel;
  }

  /**
   * Check that no record with the given field value exists.
   * Throws ConflictError if a duplicate is found.
   * @param field - The field to check (e.g. 'name')
   * @param value - The value to check for
   * @param excludeId - Optional ID to exclude (for updates)
   */
  async ensureUnique(field: string, value: string, excludeId?: string): Promise<void> {
    const where: Record<string, unknown> = {
      [field]: { equals: value, mode: 'insensitive' },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.delegate.findFirst({ where });
    if (existing) {
      throw new ConflictError(`${this.config.entityName} with this ${field} already exists`);
    }
  }

  // ============================================
  // Standard CRUD operations
  // ============================================

  /**
   * List records with pagination and search.
   * Override `buildWhere` to customize filtering.
   */
  async findMany(query: TListQuery = {} as TListQuery): Promise<PaginatedResult<TResponse>> {
    const page = query.page || 1;
    const limit = query.limit || this.config.defaultLimit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        ...(this.config.defaultInclude ? { include: this.config.defaultInclude } : {}),
      }),
      this.delegate.count({ where }),
    ]);

    const data = await this.transformMany(records as TModel[]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Find a single record by ID. Returns transformed response. */
  async findById(id: string): Promise<TResponse> {
    const record = await this.ensureExists(id);
    return this.transform(record);
  }

  /** Create a new record. Override `beforeCreate` / `afterCreate` for hooks. */
  async create(data: TCreateInput): Promise<TResponse> {
    await this.beforeCreate(data);

    const record = await this.delegate.create({
      data: data as Record<string, unknown>,
      ...(this.config.defaultInclude ? { include: this.config.defaultInclude } : {}),
    });

    const result = this.transform(record as TModel);
    await this.afterCreate(record as TModel, data);
    return result;
  }

  /** Update an existing record. Override `beforeUpdate` / `afterUpdate` for hooks. */
  async update(id: string, data: TUpdateInput): Promise<TResponse> {
    const existing = await this.ensureExists(id);
    await this.beforeUpdate(id, data, existing);

    const record = await this.delegate.update({
      where: { id },
      data: data as Record<string, unknown>,
      ...(this.config.defaultInclude ? { include: this.config.defaultInclude } : {}),
    });

    const result = this.transform(record as TModel);
    await this.afterUpdate(record as TModel, existing, data);
    return result;
  }

  /** Delete a record by ID. Override `beforeDelete` for pre-deletion checks. */
  async delete(id: string): Promise<void> {
    const existing = await this.ensureExists(id);
    await this.beforeDelete(id, existing);

    await this.delegate.delete({ where: { id } });
    await this.afterDelete(existing);
  }

  /** Count records matching the given query. */
  async count(query: TListQuery = {} as TListQuery): Promise<number> {
    const where = this.buildWhere(query);
    return this.delegate.count({ where });
  }

  // ============================================
  // Hooks — override in subclasses as needed
  // ============================================

  /** Called before create. Use for uniqueness checks, etc. */
  protected async beforeCreate(_data: TCreateInput): Promise<void> {}

  /** Called after create. Use for audit logging, side effects, etc. */
  protected async afterCreate(_record: TModel, _data: TCreateInput): Promise<void> {}

  /** Called before update. Use for uniqueness checks, etc. */
  protected async beforeUpdate(_id: string, _data: TUpdateInput, _existing: TModel): Promise<void> {}

  /** Called after update. Use for audit logging, etc. */
  protected async afterUpdate(_record: TModel, _existing: TModel, _data: TUpdateInput): Promise<void> {}

  /** Called before delete. Use for referential integrity checks. */
  protected async beforeDelete(_id: string, _existing: TModel): Promise<void> {}

  /** Called after delete. Use for audit logging, cleanup, etc. */
  protected async afterDelete(_existing: TModel): Promise<void> {}

  // ============================================
  // Query building — override for custom filters
  // ============================================

  /**
   * Build the Prisma `where` clause from query params.
   * Override in subclasses to add custom filters.
   */
  protected buildWhere(query: TListQuery): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (query.search && this.config.searchFields?.length) {
      where.OR = this.config.searchFields.map((field) => ({
        [field]: { contains: query.search, mode: 'insensitive' },
      }));
    }

    return where;
  }

  /** Build the Prisma `orderBy` clause from query params. */
  protected buildOrderBy(query: TListQuery): unknown {
    if (query.sort) {
      return { [query.sort]: query.order || 'asc' };
    }
    return this.config.defaultOrderBy || { createdAt: 'desc' };
  }

  /**
   * Transform multiple records. Override for batch optimizations
   * (e.g. fetching counts for all records in one query).
   */
  protected async transformMany(records: TModel[]): Promise<TResponse[]> {
    return records.map((r) => this.transform(r));
  }

  // ============================================
  // Transaction helper
  // ============================================

  /** Run an operation inside a transaction using the R3 withTransaction helper */
  protected async withTx<T>(
    operationName: string,
    fn: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return withTransaction(`${this.config.modelName}.${operationName}`, fn);
  }
}
