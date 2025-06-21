/**
 * Common parameter types for endpoint implementations.
 * These provide standardized parameter shapes that endpoints can use and compose.
 */

/**
 * Base type for query parameter objects.
 * Represents any object with string keys and unknown values.
 */
export type QueryParams = Record<string, unknown>;

/**
 * Common pagination parameters used across many endpoints
 */
export interface PaginationParams {
  /**
   * The maximum number of records to return
   * @default 100
   */
  limit?: number;

  /**
   * The number of records to skip
   * Used for pagination in combination with limit
   * @default 0
   */
  offset?: number;
}

/**
 * Common search parameters used across many endpoints
 */
export interface SearchParams {
  /**
   * A string used to filter records by matching on names or other searchable fields
   * The search is typically case-insensitive and matches any part of the searchable fields
   */
  search?: string;

  /**
   * The operand to use to limit or expand the search query parameter.
   * - AND: only returns records that have all search terms
   * - OR: returns records that have any of the search terms (default)
   * The operand is case-sensitive.
   */
  operand?: 'AND' | 'OR';
}

/**
 * Common status filtering parameters used across many endpoints
 */
export interface StatusParams {
  /**
   * The status of the resource.
   */
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * Sort direction values used across all endpoints
 */
export type SortOrder = 'ASCENDING' | 'DESCENDING';
