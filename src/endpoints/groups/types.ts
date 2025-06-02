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
 * Parameters for the getGroups endpoint.
 * Used to filter and paginate the list of groups.
 */
export interface GetGroupsParams {
  /**
   * The maximum number of records to return.
   * @default 100
   */
  limit?: number;

  /**
   * The number of records to skip.
   * Used for pagination in combination with limit.
   * @default 0
   */
  offset?: number;

  /**
   * A string used to filter records by matching on all or part of a group name.
   * The search is case-insensitive and matches any part of the group name.
   */
  search?: string;

  /**
   * Filter records by matching on the exact value of targetName.
   * This is case-sensitive and must match the group name exactly.
   */
  targetName?: string;
}

export interface GetGroupsResponse {
  count: number;
  total: number;
  data: Group[];
  links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}
