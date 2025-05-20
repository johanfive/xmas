import { BaseApi } from "../base.ts";
import type { HttpClient } from "../../types.ts";
import type {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  GroupsSearchParams,
  GroupResponse,
  GroupMemberResponse,
} from "./types.ts";

export class Groups extends BaseApi {
  constructor(client: HttpClient, baseUrl: string) {
    super(client, baseUrl, "/groups");
  }

  /**
   * Get all the members of a specific group
   * @param groupId The ID of the group
   * @returns A promise that resolves to the list of members in the group
   * @example
   * ```ts
   * const members = await xm.groups.getMembers("dev-team");
   * console.log(members);
   * ```
   * @throws {Error} If the request fails
   */
  getMembers(groupId: string): Promise<GroupMemberResponse> {
    return this.get(`${groupId}/members`);
  }

  /**
   * Get a specific group by ID or targetName
   * @param id The ID or targetName of the group
   * @returns A promise that resolves to the group object
   * @example
   * ```ts
   * const group = await xm.groups.getById("dev-team");
   * console.log(group);
   * ```
   * @throws {Error} If the request fails
   */
  getById(id: string): Promise<Group> {
    return this.get(id);
  }

  /**
   * Search for groups using provided criteria
   * @param params Optional search parameters including offset and limit for pagination
   * @returns A promise that resolves to the group response object
   * @example
   * ```ts
   * const response = await xm.groups.find({ searchValue: "Dev" });
   * console.log(response);
   * ```
   * @throws {Error} If the request fails
   */
  find(params?: GroupsSearchParams): Promise<GroupResponse> {
    const searchParams: Record<string, string> = {};
    if (params?.searchValue) searchParams.searchValue = params.searchValue;
    if (params?.offset !== undefined) searchParams.offset = params.offset.toString();
    if (params?.limit !== undefined) searchParams.limit = params.limit.toString();
    if (params?.propertiesToReturn?.length) {
      searchParams.propertiesToReturn = params.propertiesToReturn.join(",");
    }
    return this.get(searchParams);
  }

  /** Create a new group */
  create(input: CreateGroupInput): Promise<Group> {
    return this.post(input);
  }

  /** 
   * Update an existing group
   * @param id The group ID or targetName
   */
  update(id: string, input: UpdateGroupInput): Promise<Group> {
    return this.put(id, input);
  }

  /**
   * Delete a group
   * @param id The group ID or targetName
   */
  remove(id: string): Promise<void> {
    return this.delete(id);
  }

  /** Add members to a group */
  addMembers(groupId: string, memberIds: string[]): Promise<void> {
    return this.post(`${groupId}/members`, { data: memberIds });
  }

  /** Remove members from a group */
  removeMembers(groupId: string, memberIds: string[]): Promise<void> {
    // xM API doesn't have a bulk delete, so we need to delete one at a time
    return Promise.all(
      memberIds.map(memberId => 
        this.delete(`${groupId}/members/${memberId}`)
      )
    ).then(() => {});
  }
}
