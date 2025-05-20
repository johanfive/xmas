export interface Group {
  id: string;
  targetName: string;
  recipientType: "GROUP";
  status: "ACTIVE" | "INACTIVE";
  supervisors?: string[];
  observers?: string[];
  description?: string;
  externallyOwned?: boolean;
  allowDuplicates?: boolean;
  useDefaultDevices?: boolean;
  observedByAll?: boolean;
  externalKey?: string;
  site?: {
    id: string;
    name: string;
    links: {
      self: string;
    };
  };
  links: {
    self: string;
  };
  created: string;
  groupType: "ON_CALL" | "DYNAMIC" | "BROADCAST";
}

export interface CreateGroupInput {
  targetName: string;
  supervisors?: string[];
  observers?: string[];
  description?: string;
}

export interface UpdateGroupInput extends Partial<CreateGroupInput> {
  status?: "ACTIVE" | "INACTIVE";
}

export interface GroupsSearchParams {
  searchValue?: string;
  propertiesToReturn?: string[];
  offset?: number;
  limit?: number;
}

export interface GroupResponse {
  count: number;
  total: number;
  data: Group[];
  links: {
    self: string;
    next?: string;
  };
}

export interface GroupMemberResponseItem {
  group: {
    id: string;
    targetName: string;
    recipientType: "GROUP";
    groupType: "ON_CALL" | "DYNAMIC" | "BROADCAST";
    links: {
      self: string;
    };
  };
  member: {
    id: string;
    targetName: string;
    recipientType: "DEVICE" | "PERSON" | "GROUP";
    status: "ACTIVE" | "INACTIVE";
    deviceType?: string;
    name?: string;
    owner?: {
      id: string;
      targetName: string;
      firstName: string;
      lastName: string;
      licenseType?: string;
      recipientType: "PERSON";
      links: {
        self: string;
      };
    };
    groupType?: "ON_CALL" | "DYNAMIC" | "BROADCAST";
    links: {
      self: string;
    };
  };
}

export interface GroupMemberResponse {
  count: number;
  total: number;
  data: GroupMemberResponseItem[];
  links: {
    self: string;
    next?: string;
  };
}
