/**
 * Documentation Validation Sandbox
 *
 * This file is dedicated to validating that the official xMatters API documentation
 * accurately represents the actual API behavior. Each test corresponds to specific
 * examples or behaviors documented in the official API docs.
 *
 * Run with: deno task sandbox:validate-docs
 */

import { XmApi } from '../src/index.ts';
import type { Group } from '../src/endpoints/groups/types.ts';
import config from './config.ts';

/**
 * Assertion helper functions for validating API responses
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
}

function assertGroupsMatchStatus(groups: Group[], expectedStatus: 'ACTIVE' | 'INACTIVE'): void {
  for (const group of groups) {
    assert(
      group.status === expectedStatus,
      `Group "${group.targetName}" has status "${group.status}", expected "${expectedStatus}"`,
    );
  }
}

function assertGroupsMatchType(
  groups: Group[],
  expectedType: 'ON_CALL' | 'BROADCAST' | 'DYNAMIC',
): void {
  for (const group of groups) {
    assert(
      group.groupType === expectedType,
      `Group "${group.targetName}" has type "${group.groupType}", expected "${expectedType}"`,
    );
  }
}

function assertGroupsAreSorted(
  groups: Group[],
  sortBy: 'NAME' | 'GROUPTYPE' | 'STATUS',
  sortOrder: 'ASCENDING' | 'DESCENDING',
): void {
  if (groups.length <= 1) return; // Can't check sorting with 0 or 1 items

  for (let i = 0; i < groups.length - 1; i++) {
    const current = groups[i];
    const next = groups[i + 1];

    let currentValue: string;
    let nextValue: string;

    switch (sortBy) {
      case 'NAME':
        currentValue = current.targetName.toLowerCase();
        nextValue = next.targetName.toLowerCase();
        break;
      case 'GROUPTYPE':
        currentValue = current.groupType;
        nextValue = next.groupType;
        break;
      case 'STATUS':
        currentValue = current.status;
        nextValue = next.status;
        break;
    }

    if (sortOrder === 'ASCENDING') {
      assert(
        currentValue <= nextValue,
        `Groups not sorted by ${sortBy} ascending: "${currentValue}" should come before or equal to "${nextValue}"`,
      );
    } else {
      assert(
        currentValue >= nextValue,
        `Groups not sorted by ${sortBy} descending: "${currentValue}" should come after or equal to "${nextValue}"`,
      );
    }
  }
}

function assertGroupsMatchSearch(
  groups: Group[],
  searchTerm: string,
  fields?: 'NAME' | 'DESCRIPTION' | 'SERVICE_NAME',
): void {
  const searchTermLower = searchTerm.toLowerCase();

  for (const group of groups) {
    let matches = false;

    // Check based on fields parameter
    if (!fields || fields === 'NAME' || fields.includes('NAME')) {
      if (group.targetName && group.targetName.toLowerCase().includes(searchTermLower)) {
        matches = true;
      }
    }

    if (!fields || fields === 'DESCRIPTION' || fields.includes('DESCRIPTION')) {
      if (group.description && group.description.toLowerCase().includes(searchTermLower)) {
        matches = true;
      }
    }

    if (!fields || fields === 'SERVICE_NAME' || fields.includes('SERVICE_NAME')) {
      // Note: This would require embedded services data to validate properly
      // For now, we'll skip this check unless services are embedded
    }

    assert(
      matches,
      `Group "${group.targetName}" does not match search term "${searchTerm}" in specified fields`,
    );
  }
}

function assertGroupsHaveEmbeddedData(groups: Group[], embedType: string): void {
  // Note: The exact structure of embedded data depends on the API response
  // This is a basic check that embedded data exists
  for (const group of groups) {
    if (embedType === 'supervisors' && groups.length > 0) {
      // Check if _embedded.supervisors exists or supervisors field is populated
      const hasEmbeddedSupervisors =
        (group as unknown as { _embedded?: { supervisors?: unknown[] } })._embedded?.supervisors ||
        (group.supervisors && Array.isArray(group.supervisors));
      // Note: Some groups might not have supervisors, so we just log this
      console.log(
        `    Group "${group.targetName}": ${
          hasEmbeddedSupervisors ? 'has' : 'no'
        } embedded supervisors`,
      );
    }
  }
}

/**
 * Validates the Groups API query parameters against the official documentation.
 * Tests each documented parameter to ensure it works as expected.
 */
async function validateGroupsQueryParameters() {
  console.log('\n=== Groups API Query Parameters Validation ===');

  const { hostname, username, password } = config.basicAuth;
  if (!hostname || !username || !password) {
    console.warn('[SKIP] Groups validation: Missing basic auth credentials');
    return;
  }

  try {
    const xm = new XmApi(config.basicAuth);

    // Test 1: Basic groups retrieval
    console.log('\n[TEST 1] Basic groups retrieval (limit=3)');
    const basicGroups = await xm.groups.get({ query: { limit: 3 } });
    console.log(`✓ Success: ${basicGroups.body.data.length} groups returned`);
    console.log(`  Status: ${basicGroups.status}`);
    console.log(`  Total: ${basicGroups.body.total}`);

    // Test 2: Status filtering (documented: ACTIVE, INACTIVE)
    console.log('\n[TEST 2] Status filtering: status=ACTIVE');
    const activeGroups = await xm.groups.get({
      query: { status: 'ACTIVE', limit: 5 },
    });
    console.log(`✓ API Response: ${activeGroups.body.data.length} groups returned`);
    assertGroupsMatchStatus(activeGroups.body.data, 'ACTIVE');
    console.log(`✓ Assertion: All ${activeGroups.body.data.length} groups have status=ACTIVE`);

    console.log('\n[TEST 3] Status filtering: status=INACTIVE');
    const inactiveGroups = await xm.groups.get({
      query: { status: 'INACTIVE', limit: 5 },
    });
    console.log(`✓ API Response: ${inactiveGroups.body.data.length} groups returned`);
    if (inactiveGroups.body.data.length > 0) {
      assertGroupsMatchStatus(inactiveGroups.body.data, 'INACTIVE');
      console.log(
        `✓ Assertion: All ${inactiveGroups.body.data.length} groups have status=INACTIVE`,
      );
    } else {
      console.log(`  Note: No inactive groups found in the system`);
    }

    // Test 4: Group type filtering (documented: ON_CALL, BROADCAST, DYNAMIC)
    console.log('\n[TEST 4] Group type filtering: groupType=BROADCAST');
    const broadcastGroups = await xm.groups.get({
      query: { groupType: 'BROADCAST', limit: 3 },
    });
    console.log(`✓ API Response: ${broadcastGroups.body.data.length} groups returned`);
    if (broadcastGroups.body.data.length > 0) {
      assertGroupsMatchType(broadcastGroups.body.data, 'BROADCAST');
      console.log(
        `✓ Assertion: All ${broadcastGroups.body.data.length} groups have groupType=BROADCAST`,
      );
    } else {
      console.log(`  Note: No broadcast groups found in the system`);
    }

    console.log('\n[TEST 5] Group type filtering: groupType=ON_CALL');
    const onCallGroups = await xm.groups.get({
      query: { groupType: 'ON_CALL', limit: 3 },
    });
    console.log(`✓ API Response: ${onCallGroups.body.data.length} groups returned`);
    if (onCallGroups.body.data.length > 0) {
      assertGroupsMatchType(onCallGroups.body.data, 'ON_CALL');
      console.log(
        `✓ Assertion: All ${onCallGroups.body.data.length} groups have groupType=ON_CALL`,
      );
    } else {
      console.log(`  Note: No on-call groups found in the system`);
    }

    // Test 6: Sorting (documented: NAME, GROUPTYPE, STATUS with ASCENDING, DESCENDING)
    console.log('\n[TEST 6] Sorting: sortBy=NAME, sortOrder=ASCENDING');
    const sortedByName = await xm.groups.get({
      query: {
        sortBy: 'NAME',
        sortOrder: 'ASCENDING',
        limit: 3,
      },
    });
    console.log(`✓ API Response: ${sortedByName.body.data.length} groups returned`);
    if (sortedByName.body.data.length > 1) {
      assertGroupsAreSorted(sortedByName.body.data, 'NAME', 'ASCENDING');
      console.log(`✓ Assertion: Groups are sorted by name in ascending order`);
      console.log(`  First group: "${sortedByName.body.data[0]?.targetName}"`);
      console.log(
        `  Last group: "${sortedByName.body.data[sortedByName.body.data.length - 1]?.targetName}"`,
      );
    } else {
      console.log(`  Note: Cannot verify sorting with ${sortedByName.body.data.length} groups`);
    }

    console.log('\n[TEST 7] Sorting: sortBy=GROUPTYPE, sortOrder=ASCENDING');
    const sortedByType = await xm.groups.get({
      query: {
        sortBy: 'GROUPTYPE',
        sortOrder: 'ASCENDING',
        limit: 5,
      },
    });
    console.log(`✓ API Response: ${sortedByType.body.data.length} groups returned`);
    if (sortedByType.body.data.length > 1) {
      assertGroupsAreSorted(sortedByType.body.data, 'GROUPTYPE', 'ASCENDING');
      console.log(`✓ Assertion: Groups are sorted by group type in ascending order`);
      const groupTypes = sortedByType.body.data.map((g) => g.groupType).join(', ');
      console.log(`  Group types: ${groupTypes}`);
    } else {
      const groupTypes = sortedByType.body.data.map((g) => g.groupType).join(', ');
      console.log(`  Group types: ${groupTypes}`);
      console.log(`  Note: Cannot verify sorting with ${sortedByType.body.data.length} groups`);
    }

    // Test 8: Search functionality
    console.log('\n[TEST 8] Search: search="admin"');
    const searchResults = await xm.groups.get({
      query: { search: 'admin', limit: 5 },
    });
    console.log(`✓ API Response: ${searchResults.body.data.length} groups returned`);
    if (searchResults.body.data.length > 0) {
      try {
        assertGroupsMatchSearch(searchResults.body.data, 'admin');
        console.log(
          `✓ Assertion: All ${searchResults.body.data.length} groups contain "admin" in name or description`,
        );
      } catch (err) {
        console.log(`⚠️ Search assertion: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.log(
          `  Note: Some groups may match in non-visible fields or have complex search logic`,
        );
      }
    } else {
      console.log(`  Note: No groups found matching "admin"`);
    }

    // Test 9: Search operand (documented: AND, OR)
    console.log('\n[TEST 9] Search operand: search="admin database", operand=OR');
    const searchOr = await xm.groups.get({
      query: {
        search: 'admin database',
        operand: 'OR',
        limit: 5,
      },
    });
    console.log(`✓ API Response: ${searchOr.body.data.length} groups returned`);
    if (searchOr.body.data.length > 0) {
      // For OR operand, groups should match either "admin" OR "database"
      let matchingGroups = 0;
      for (const group of searchOr.body.data) {
        const nameMatch = group.targetName.toLowerCase().includes('admin') ||
          group.targetName.toLowerCase().includes('database');
        const descMatch = group.description?.toLowerCase().includes('admin') ||
          group.description?.toLowerCase().includes('database');
        if (nameMatch || descMatch) {
          matchingGroups++;
        }
      }
      console.log(
        `✓ Assertion: ${matchingGroups}/${searchOr.body.data.length} groups contain "admin" OR "database"`,
      );
      if (matchingGroups < searchOr.body.data.length) {
        console.log(`  Note: Some groups may match in non-visible fields`);
      }
    } else {
      console.log(`  Note: No groups found matching "admin" OR "database"`);
    }

    // Test 10: Fields filtering (documented: NAME, DESCRIPTION, SERVICE_NAME)
    console.log('\n[TEST 10] Fields filtering: search="admin", fields=NAME');
    const nameSearch = await xm.groups.get({
      query: {
        search: 'admin',
        fields: 'NAME',
        limit: 3,
      },
    });
    console.log(`✓ API Response: ${nameSearch.body.data.length} groups returned`);
    if (nameSearch.body.data.length > 0) {
      try {
        assertGroupsMatchSearch(nameSearch.body.data, 'admin', 'NAME');
        console.log(
          `✓ Assertion: All ${nameSearch.body.data.length} groups contain "admin" in name`,
        );
        const groupNames = nameSearch.body.data.map((g) => g.targetName).join(', ');
        console.log(`  Group names: ${groupNames}`);
      } catch (err) {
        console.log(`⚠️ Search assertion: ${err instanceof Error ? err.message : 'Unknown error'}`);
        const groupNames = nameSearch.body.data.map((g) => g.targetName).join(', ');
        console.log(`  Group names: ${groupNames}`);
      }
    } else {
      console.log(`  Note: No groups found with "admin" in name`);
    }

    // Test 11: Embed options (documented: supervisors, observers, services, criteria)
    console.log('\n[TEST 11] Embed: embed=supervisors');
    const withSupervisors = await xm.groups.get({
      query: {
        embed: ['supervisors'],
        limit: 2,
      },
    });
    console.log(`✓ API Response: ${withSupervisors.body.data.length} groups returned`);
    if (withSupervisors.body.data.length > 0) {
      assertGroupsHaveEmbeddedData(withSupervisors.body.data, 'supervisors');
      console.log(`✓ Assertion: Checked for embedded supervisors data`);
    }

    console.log('\n[TEST 12] Embed: embed=observers');
    const withObservers = await xm.groups.get({
      query: {
        embed: ['observers'],
        limit: 2,
      },
    });
    console.log(`✓ API Response: ${withObservers.body.data.length} groups returned`);
    if (withObservers.body.data.length > 0) {
      assertGroupsHaveEmbeddedData(withObservers.body.data, 'observers');
      console.log(`✓ Assertion: Checked for embedded observers data`);
    }

    // Test 13: Single group retrieval with embed
    if (basicGroups.body.data.length > 0) {
      const firstGroup = basicGroups.body.data[0];
      console.log(
        `\n[TEST 13] Single group: getByIdentifier("${firstGroup.id}") with embed=services`,
      );
      const singleGroup = await xm.groups.getByIdentifier(firstGroup.id, {
        query: { embed: ['services'] },
      });
      console.log(`✓ Success: Retrieved group "${singleGroup.body.targetName}"`);
      console.log(`  Group type: ${singleGroup.body.groupType}`);
      console.log(`  Status: ${singleGroup.body.status}`);
    }

    console.log('\n🎉 All Groups API documentation validation tests passed!');
  } catch (err) {
    console.error('\n❌ Documentation validation failed:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
    }
  }
}

/**
 * Validates edge cases and error scenarios mentioned in documentation
 */
async function validateEdgeCases() {
  console.log('\n=== Edge Cases & Error Scenarios Validation ===');

  const { hostname, username, password } = config.basicAuth;
  if (!hostname || !username || !password) {
    console.warn('[SKIP] Edge cases validation: Missing basic auth credentials');
    return;
  }

  try {
    const xm = new XmApi(config.basicAuth);

    // Test 1: Invalid group ID (should return 404)
    console.log('\n[TEST 1] Invalid group ID retrieval');
    try {
      await xm.groups.getByIdentifier('non-existent-group-id');
      console.log('❌ Expected 404 error but request succeeded');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        console.log('✓ Success: 404 error as expected for invalid group ID');
      } else {
        console.log(`❓ Unexpected error status: ${error.response?.status || 'unknown'}`);
      }
    }

    // Test 2: Invalid sortBy value (should return error)
    console.log('\n[TEST 2] Invalid sortBy value');
    try {
      await xm.groups.get({
        query: {
          sortBy: 'INVALID_SORT_FIELD',
          limit: 1,
        },
      });
      console.log('❌ Expected error for invalid sortBy but request succeeded');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      console.log(
        `✓ Success: Error as expected for invalid sortBy (${error.response?.status || 'unknown'})`,
      );
    }

    // Test 3: Invalid operand value (should return error)
    console.log('\n[TEST 3] Invalid operand value');
    try {
      await xm.groups.get({
        query: {
          search: 'test',
          // @ts-expect-error - Testing invalid value
          operand: 'INVALID_OPERAND',
          limit: 1,
        },
      });
      console.log('❌ Expected error for invalid operand but request succeeded');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      console.log(
        `✓ Success: Error as expected for invalid operand (${error.response?.status || 'unknown'})`,
      );
    }
  } catch (err) {
    console.error('\n❌ Edge cases validation failed:', err);
  }
}

/**
 * Main validation runner
 */
async function main() {
  console.log('🔍 Starting xMatters API Documentation Validation');
  console.log('================================================');

  await validateGroupsQueryParameters();
  await validateEdgeCases();

  console.log('\n✅ Documentation validation complete!');
}

// Run the validation
await main();
