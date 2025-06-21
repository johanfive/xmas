import type { PaginatedResponse } from '../../core/types/endpoint/response.ts';
import type {
  PaginationParams,
  QueryParams,
  SearchParams,
  SortOrder,
  StatusParams,
} from '../../core/types/endpoint/params.ts';

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
 * Individual search field options that can be combined
 */
export type GroupSearchField = 'NAME' | 'DESCRIPTION' | 'SERVICE_NAME';

/**
 * Type for filters that can be applied when retrieving groups.
 */
export interface GroupFilters extends QueryParams {
  /**
   * Filter records by matching on the exact value of targetName.
   * This is case-sensitive and must match the group name exactly.
   */
  targetName?: string;

  /**
   * Defines the field to search when a search term is specified.
   * Can specify individual fields or arrays of fields to search.
   * - NAME: searches only the group name
   * - DESCRIPTION: searches only the group description
   * - SERVICE_NAME: searches for the name of a service
   */
  fields?: GroupSearchField | GroupSearchField[];

  /**
   * Specifies the group type to return in the response.
   */
  groupType?: 'ON_CALL' | 'BROADCAST' | 'DYNAMIC';

  /**
   * The targetName or id of the users, or devices that are members of an on-call or broadcast group.
   * Can be a comma-separated list for multiple members.
   * Returns all groups that contain any of the queried members.
   */
  members?: string | string[];

  /**
   * Returns a list of groups that have shifts created, but no members added to the shifts.
   * - ALL_SHIFTS: Returns groups that have no members added to any shifts
   * - ANY_SHIFTS: Returns groups that have at least one shift with no members added to it
   */
  'member.exists'?: 'ALL_SHIFTS' | 'ANY_SHIFTS';

  /**
   * Returns a list of groups that contain at least one member (or a device that belongs to a user)
   * who has the specified license type. The member does not have to be part of any shifts for the
   * group to be included in the response.
   */
  'member.licenseType'?: 'FULL_USER' | 'STAKEHOLDER_USER';

  /**
   * A comma-separated list of sites whose groups you want to retrieve.
   * You can specify the site using its unique identifier (id) or name (case-insensitive), or both.
   * When two or more sites are sent in the request, the response includes groups for which either site is assigned.
   */
  sites?: string | string[];

  /**
   * A comma-separated list of supervisors whose groups you want to retrieve.
   * You can specify the supervisors using targetName (case-insensitive) or id (or both if searching for multiple supervisors).
   * When two or more supervisors are sent in the request, the response includes groups for which either user is a supervisor.
   */
  supervisors?: string | string[];
}

/**
 * Group-specific sort parameters
 */
export interface GroupSortParams {
  /**
   * Field to sort by
   */
  sortBy?: 'NAME' | 'GROUPTYPE' | 'STATUS';

  /**
   * Sort direction
   * @default 'ASCENDING'
   */
  sortOrder?: SortOrder;
}

/**
 * Supported embed values for retrieving groups.
 * These apply to both single group and multiple groups endpoints.
 */
export type GroupEmbedOptions =
  | 'supervisors' // Up to the first 100 group supervisors (single group) or paginated list (multiple groups)
  | 'observers' // Returns the id and name of the role(s) set as observers for the group
  | 'services' // Returns the list of services owned by the group
  | 'criteria'; // Returns the criteria specified for dynamic groups (only applicable when groupType=DYNAMIC)

/**
 * Type for parameters used when retrieving a single group by identifier.
 * Supports embedding related objects in the response.
 */
export interface GetGroupParams extends Record<string, unknown> {
  /**
   * Objects to embed in the response. Can be a single value or an array of values.
   * For new/undocumented embed options, use type assertion: 'newOption' as GroupEmbedOptions or any
   */
  embed?: GroupEmbedOptions | GroupEmbedOptions[];
}

/**
 * Type for parameters used in methods that retrieve lists of groups.
 * Combines common pagination, search, status, sort, and group-specific filters and embed options.
 */
export type GetGroupsParams =
  & PaginationParams
  & SearchParams
  & StatusParams
  & GroupFilters
  & GroupSortParams
  & GetGroupParams;

/**
 * Response type for methods that return a list of groups.
 * This is a paginated response containing an array of Group objects.
 */
export type GetGroupsResponse = PaginatedResponse<Group>;
