/**
 * Type composers for composing endpoint parameter types.
 * These utilities make it easy to build complex parameter types by composing simpler ones.
 */

import type { PaginationParams, SearchParams, SortParams } from './params.ts';

/**
 * Helper type to add pagination to endpoint parameters
 */
export type WithPagination<T extends Record<string, unknown> = Record<string, never>> =
  & T
  & PaginationParams;

/**
 * Helper type to add search capability to endpoint parameters
 */
export type WithSearch<T extends Record<string, unknown> = Record<string, never>> =
  & T
  & SearchParams;

/**
 * Helper type to add sorting to endpoint parameters
 */
export type WithSort<T extends Record<string, unknown> = Record<string, never>> = T & SortParams;

/**
 * Common type utilities for composing endpoint parameter types.
 *
 * @example Simple paginated endpoint
 * ```typescript
 * interface DeviceFilters extends Record<string, unknown> {
 *   status?: 'ACTIVE' | 'INACTIVE';
 * }
 *
 * type GetDevicesParams = WithPagination<DeviceFilters>;
 * // Results in:
 * // {
 * //   status?: 'ACTIVE' | 'INACTIVE';
 * //   limit?: number;
 * //   offset?: number;
 * // }
 * ```
 *
 * @example Endpoint with search and pagination
 * ```typescript
 * interface UserFilters extends Record<string, unknown> {
 *   role?: string;
 * }
 *
 * // Compose multiple parameter types
 * type GetUsersParams = WithPagination<WithSearch<UserFilters>>;
 * // Results in:
 * // {
 * //   role?: string;
 * //   search?: string;
 * //   limit?: number;
 * //   offset?: number;
 * // }
 * ```
 *
 * @example Full endpoint type definition
 * ```typescript
 * // 1. Define your resource type
 * interface User {
 *   id: string;
 *   name: string;
 *   // ...other properties
 * }
 *
 * // 2. Define endpoint-specific filters
 * interface UserFilters extends Record<string, unknown> {
 *   role?: string;
 *   status?: 'ACTIVE' | 'INACTIVE';
 * }
 *
 * // 3. Compose parameter types with pagination, search, and sort
 * type GetUsersParams = WithPagination<WithSearch<WithSort<UserFilters>>>;
 *
 * // 4. Use the HTTP response wrapper types for return types
 * // For paginated responses:
 * type GetUsersResponse = PaginatedHttpResponse<User>;
 * // For single resource responses:
 * type GetUserResponse = ResourceHttpResponse<User>;
 *
 * // Now you can implement your endpoint:
 * class UsersEndpoint {
 *   async getUsers(params?: GetUsersParams): GetUsersResponse {
 *     return this.http.get({ path: '/users', query: params });
 *   }
 *
 *   async getByIdentifier(id: string): GetUserResponse {
 *     return this.http.get({ path: `/${id}` });
 *   }
 * }
 * ```
 */
