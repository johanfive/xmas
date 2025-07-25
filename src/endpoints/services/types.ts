import type { PaginationParams, SearchParams } from 'types/query-params.ts';

/**
 * Represents a service in xMatters.
 */
export interface Service {
  id: string;
  targetName: string;
  recipientType: 'SERVICE';
  description?: string;
  serviceType: ServiceType;
  serviceTier: ServiceTier;
  ownedBy: ServiceOwner;
  links?: {
    self: string;
  };
}

/**
 * Represents the owner of a service, which is always a group.
 */
export interface ServiceOwner {
  id: string;
  targetName: string;
  recipientType: 'GROUP';
  links?: {
    self: string;
  };
}

/**
 * The type of a service.
 */
export type ServiceType = 'APPLICATION' | 'TECHNICAL';

/**
 * The tier (importance level) of a service.
 */
export type ServiceTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';

/**
 * Query parameters for getting a list of services.
 */
export interface GetServicesParams extends PaginationParams, SearchParams {
  /**
   * Defines the field to search when a search term is specified.
   */
  fields?: 'NAME' | 'DESCRIPTION';
  /**
   * The targetName or unique id (UUID) of the group that owns the service.
   */
  ownedBy?: string;
  /**
   * The tier (or importance level) of a service in your xMatters instance.
   */
  serviceTier?: ServiceTier;
  /**
   * The type of service in your xMatters instance.
   */
  serviceType?: ServiceType;
}

/**
 * A reference to a group by ID or targetName.
 */
export interface GroupReference {
  id?: string;
  targetName?: string;
}

/**
 * The payload for creating a service.
 */
export type CreateService =
  & Required<Pick<Service, 'targetName'>>
  & Omit<Partial<Service>, 'id' | 'ownedBy' | 'recipientType' | 'links'>
  & {
    ownedBy?: string | GroupReference;
  };

/**
 * The payload for updating a service.
 */
export type UpdateService =
  & Required<Pick<Service, 'id'>>
  & Omit<Partial<Service>, 'ownedBy' | 'recipientType' | 'links'>
  & {
    ownedBy?: string | GroupReference;
  };
