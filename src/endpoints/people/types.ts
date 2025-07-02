import type {
  PaginationParams,
  QueryParams,
  SearchParams,
  SortOrder,
  StatusParams,
} from '../../core/types/endpoint/params.ts';

/**
 * Represents a person in xMatters.
 */
export interface Person {
  /** Unique identifier for the person */
  id: string;
  /** The name of the person used for targeting */
  targetName: string;
  /** Type of recipient */
  recipientType:
    | 'PERSON'
    | 'GROUP'
    | 'DEVICE'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new recipient types to be used with type assertion
  /** Whether the person is active or inactive */
  status:
    | 'ACTIVE'
    | 'INACTIVE'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new status values to be used with type assertion
  /** The person's first name */
  firstName: string;
  /** The person's last name */
  lastName: string;
  /** Language preference for the person */
  language: string;
  /** Timezone setting for the person */
  timezone: string;
  /** Web login username */
  webLogin: string;
  /** Phone login number for voice authentication */
  phoneLogin?: string;
  /** Whether the person is managed by an external system */
  externallyOwned: boolean;
  /** Site information for the person */
  site: {
    id: string;
    name: string;
    links: {
      self: string;
    };
  };
  /** Custom properties and attributes */
  properties?: Record<string, unknown>;
  /** ISO timestamp of last login */
  lastLogin?: string;
  /** Revision information */
  revision?: {
    id: string;
    at: string;
    seq: string;
  };
  /** License type for the person */
  licenseType?:
    | 'FULL_USER'
    | 'STAKEHOLDER_USER'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new license types to be used with type assertion
  /** HAL links for the person */
  links?: {
    /** URL to this person resource */
    self: string;
  };
}

export type PersonRole =
  | 'Standard User'
  // deno-lint-ignore ban-types
  | (string & {});
export type PersonRoles = PersonRole | PersonRole[];

export type CreatePerson =
  & Required<{ roles: PersonRoles } & Pick<Person, 'targetName' | 'firstName' | 'lastName'>>
  & Partial<Omit<Person, 'id'>>;

export type UpdatePerson =
  & Required<Pick<Person, 'id'>>
  & Partial<Person>
  & { roles?: PersonRoles };

/**
 * Individual search field options that can be combined
 */
export type PersonSearchField =
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'TARGET_NAME'
  | 'WEB_LOGIN'
  | 'EMAIL_ADDRESS'
  | 'PHONE_NUMBER'
  // deno-lint-ignore ban-types
  | (string & {}); // Allows for new or undocumented search fields to be used with type assertion

/**
 * Type for filters that can be applied when retrieving people.
 */
export interface PersonFilters extends QueryParams {
  /**
   * Filter records by matching on the exact value of targetName.
   * This is case-sensitive and must match the person name exactly.
   */
  targetName?: string;

  /**
   * Defines the field to search when a search term is specified.
   * Can specify individual fields or arrays of fields to search.
   */
  fields?: PersonSearchField | PersonSearchField[];

  /**
   * Returns a list of people created after the provided timestamp (in ISO format).
   * Can be used on its own or in conjunction with createdBefore and createdTo.
   */
  createdAfter?: string;

  /**
   * Returns a list of people created before (and excluding) the provided timestamp (in ISO format).
   * Can be used on its own or in conjunction with createdAfter and createdFrom.
   */
  createdBefore?: string;

  /**
   * Returns a list of people created from the provided timestamp (in ISO format).
   * Can be used on its own or in conjunction with createdTo and createdBefore.
   */
  createdFrom?: string;

  /**
   * Returns a list of people created up to (and including) the provided timestamp (in ISO format).
   * Can be used on its own or in conjunction with createdFrom and createdAfter.
   */
  createdTo?: string;

  /**
   * Returns a list of users who have (or don't have) devices associated with their account.
   */
  'devices.exists'?: boolean;

  /**
   * Returns a list of users who have (or don't have) email devices associated with their account.
   */
  'devices.email.exists'?: boolean;

  /**
   * Returns a list of users who have (or don't have) failsafe devices associated with their account.
   */
  'devices.failsafe.exists'?: boolean;

  /**
   * Returns a list of users who have (or don't have) devices with the xMatters mobile app associated with their account.
   */
  'devices.mobile.exists'?: boolean;

  /**
   * Returns a list of users who have (or don't have) SMS devices associated with their account.
   */
  'devices.sms.exists'?: boolean;

  /**
   * Returns a list of users who have (or don't have) voice devices associated with their account.
   */
  'devices.voice.exists'?: boolean;

  /**
   * Returns a list of devices for each user and includes whether each device is active or inactive.
   */
  'devices.status'?:
    | 'ACTIVE'
    | 'INACTIVE'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new device status values to be used with type assertion

  /**
   * Returns a list of devices for each user and includes whether each device was successfully tested or not.
   */
  'devices.testStatus'?:
    | 'INVALID'
    | 'TESTED'
    | 'UNTESTED'
    | 'UNTESTED_FAILSAFE'
    | 'PENDING'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new test status values to be used with type assertion

  /**
   * The valid email address of the user.
   * Can be combined with propertyNames, propertyValues to further narrow your search results.
   */
  emailAddress?: string;

  /**
   * The first name of the user.
   * Can be combined with propertyNames, propertyValues to further narrow your search results.
   */
  firstName?: string;

  /**
   * The last name of the user.
   * Can be combined with propertyNames, propertyValues to further narrow your search results.
   */
  lastName?: string;

  /**
   * A comma-separated list of group target names or UUIDs.
   * When multiple groups are specified, the results return users who are members of any of the specified groups.
   */
  groups?: string | string[];

  /**
   * Returns a list of users who have (or don't have) groups associated with their account.
   */
  'groups.exists'?: boolean;

  /**
   * Filter by license type.
   */
  licenseType?:
    | 'FULL_USER'
    | 'STAKEHOLDER_USER'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new license types to be used with type assertion

  /**
   * The phone number of the user.
   * Can be combined with propertyNames, propertyValues to further narrow your search results.
   */
  phoneNumber?: string;

  /**
   * A comma-separated list of custom field/attribute names to search for.
   * Must be used in conjunction with propertyValues.
   */
  propertyNames?: string | string[];

  /**
   * A comma-separated list of custom field/attribute values to search for.
   * Must be used in conjunction with propertyNames.
   */
  propertyValues?: string | string[];

  /**
   * A comma-separated list of role names to filter by.
   * Returns users who have any of the specified roles.
   */
  roles?: string | string[];

  /**
   * A comma-separated list of sites whose people you want to retrieve.
   * You can specify the site using its unique identifier (id) or name (case-insensitive), or both.
   */
  site?: string | string[];

  /**
   * A comma-separated list of supervisors whose people you want to retrieve.
   * You can specify the supervisors using targetName (case-insensitive) or id.
   */
  supervisors?: string | string[];

  /**
   * Returns a list of users who have (or don't have) supervisors associated with their account.
   */
  'supervisors.exists'?: boolean;

  /**
   * The web login name of the user.
   */
  webLogin?: string;
}

/**
 * Person-specific sort parameters
 */
export interface PersonSortParams {
  /**
   * Field to sort by
   */
  sortBy?:
    | 'FIRST_LAST_NAME'
    | 'LAST_FIRST_NAME'
    | 'TARGET_NAME'
    | 'CREATED'
    | 'LAST_LOGIN'
    // deno-lint-ignore ban-types
    | (string & {}); // Allows for new sort fields to be used with type assertion

  /**
   * Sort direction
   * @default 'ASCENDING'
   */
  sortOrder?: SortOrder;
}

/**
 * Supported embed values for retrieving people.
 * These apply to both single person and multiple people endpoints.
 */
export type PersonEmbedOptions =
  | 'roles' // includes the person's roles in the result
  | 'supervisors' // includes the person's supervisors in the result
  | 'devices' // includes a list of each person's devices
  // deno-lint-ignore ban-types
  | (string & {}); // Allows for new or undocumented embed options to be used with type assertion

/**
 * Type for parameters used when retrieving a single person by identifier.
 * Supports embedding related objects in the response.
 */
export interface GetPersonParams extends Record<string, unknown> {
  /**
   * Objects to embed in the response. Can be a single value or an array of values.
   * For new/undocumented embed options, use type assertion: 'newOption' as PersonEmbedOptions or any
   */
  embed?: PersonEmbedOptions | PersonEmbedOptions[];
}

/**
 * Type for parameters used in methods that retrieve lists of people.
 * Combines common pagination, search, status, sort, and person-specific filters and embed options.
 */
export type GetPersonsParams =
  & PaginationParams
  & SearchParams
  & StatusParams
  & PersonFilters
  & PersonSortParams
  & GetPersonParams;
