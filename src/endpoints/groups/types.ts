import { PaginatedResponse } from '../../core/types/endpoint/response.ts';
import { WithPagination, WithSearch } from '../../core/types/endpoint/composers.ts';

/**
 * Represents a group in xMatters.
 */
export interface Group {
  /** Unique identifier for the group */
  id: string;
  /** The name of the group used for targeting */
  targetName: string;
  /** Type of recipient */
  recipientType: 'GROUP' | 'DEVICE' | 'PERSON';
  /** Whether the group is active or inactive */
  status: 'ACTIVE' | 'INACTIVE';
  /** The type of group */
  groupType: 'ON_CALL' | 'BROADCAST' | 'DYNAMIC';
  /** ISO timestamp when the group was created */
  created: string;
  /** Optional description of the group's purpose */
  description?: string;
  /** List of user IDs that are supervisors of this group */
  supervisors?: string[];
  /** Whether the group is managed by an external system */
  externallyOwned?: boolean;
  /** Whether duplicate members are allowed */
  allowDuplicates?: boolean;
  /** Whether to use default devices for members */
  useDefaultDevices?: boolean;
  /** Whether the group is visible to all users */
  observedByAll?: boolean;
  /** External identifier for the group */
  externalKey?: string;
  /** Site information if the group belongs to a specific site */
  site?: {
    id: string;
    name: string;
    links: {
      self: string;
    };
  };
  /** HAL links for the group */
  links?: {
    /** URL to this group resource */
    self: string;
  };
  /** ISO timestamp when the group was last modified */
  lastModified?: string;
}

/**
 * Type for filters that can be applied when retrieving groups.
 */
export interface GroupFilters extends Record<string, unknown> {
  /**
   * Filter records by matching on the exact value of targetName.
   * This is case-sensitive and must match the group name exactly.
   */
  targetName?: string;
}

/**
 * Type for parameters used in methods that retrieve lists of groups.
 * Combines common pagination and search with group-specific filters.
 */
export type GetGroupsParams = WithPagination<WithSearch<GroupFilters>>;

/**
 * Response type for methods that return a list of groups.
 * This is a paginated response containing an array of Group objects.
 */
export type GetGroupsResponse = PaginatedResponse<Group>;
