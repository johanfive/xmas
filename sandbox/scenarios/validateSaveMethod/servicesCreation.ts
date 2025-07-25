import { XmApi } from '../../../src/index.ts';
import config from '../../config.ts';
import printError from '../printError.ts';

const minimalCreatePayload = {
  targetName: 'My Test Service',
};

const createPayloadWithownedByAsGroupId = (groupId: string) => ({
  ...minimalCreatePayload,
  ownedBy: groupId,
});

const createPayloadWithOwnedByAsGroupNameString = (groupName: string) => ({
  ...minimalCreatePayload,
  ownedBy: groupName,
});

const createPayloadWithOwnedByAsGroupObjectWithId = (groupId: string) => ({
  ...minimalCreatePayload,
  ownedBy: { id: groupId },
});

const createPayloadWithOwnedByAsGroupObjectWithTargetName = (groupName: string) => ({
  ...minimalCreatePayload,
  ownedBy: { targetName: groupName },
});

export default async function testServicesCreation() {
  console.log('\\n=== Test Services Endpoint ===');
  try {
    const xm = new XmApi(config.basicAuth);
    const marvel = await xm.groups.getByIdentifier('Marvel');

    const experiments = [
      {
        name: '1: Minimal payload (targetName only)',
        payload: minimalCreatePayload,
      },
      {
        name: '2: With description',
        payload: { ...minimalCreatePayload, description: 'A test description' },
      },
      {
        name: '3: With serviceType',
        payload: { ...minimalCreatePayload, serviceType: 'APPLICATION' },
      },
      {
        name: '4: With serviceTier',
        payload: { ...minimalCreatePayload, serviceTier: 'GOLD' },
      },
      {
        name: '5: With all properties',
        payload: {
          ...minimalCreatePayload,
          description: 'A test description',
          serviceType: 'TECHNICAL',
          serviceTier: 'SILVER',
          ownedBy: { id: marvel.body.id },
        },
      },
      {
        name: "6: ownedBy as Group ID (string) - e.g., '...' ",
        payload: createPayloadWithownedByAsGroupId(marvel.body.id),
      },
      {
        name: "7: ownedBy as Group Name (string) - e.g., 'Marvel'",
        payload: createPayloadWithOwnedByAsGroupNameString(marvel.body.targetName),
      },
      {
        name: "8: ownedBy as Group ID (object) - e.g., { id: '...' }",
        payload: createPayloadWithOwnedByAsGroupObjectWithId(marvel.body.id),
      },
      {
        name: "9: ownedBy as Group Name (object) - e.g., { targetName: '...' }",
        payload: createPayloadWithOwnedByAsGroupObjectWithTargetName(marvel.body.targetName),
      },
      {
        name: '10: Invalid description type (number)',
        payload: {
          ...minimalCreatePayload,
          description: 12345,
        },
      },
      {
        name: '11: Invalid serviceType value',
        payload: {
          ...minimalCreatePayload,
          serviceType: 'INVALID_TYPE',
        },
      },
      {
        name: '12: Invalid serviceTier value',
        payload: {
          ...minimalCreatePayload,
          serviceTier: 'INVALID_TIER',
        },
      },
    ];

    for (const [i, experiment] of experiments.entries()) {
      // Use a unique name for each service to avoid conflicts
      const serviceCreationPayload = {
        ...experiment.payload,
        targetName: `My Test Service ${Date.now()} ${i + 1}`,
      };

      console.log(`\\n--- Experiment ${experiment.name} ---`);
      try {
        // The method might have type errors with some payloads,
        // so we use 'as any' to bypass them for the experiment
        // deno-lint-ignore no-explicit-any
        const createResponse = await xm.services.save(serviceCreationPayload as any);
        console.log(
          '[SUCCESS] Create Service:',
          createResponse.status,
          // Only log relevant parts of the body to keep output clean
          {
            id: createResponse.body.id,
            targetName: createResponse.body.targetName,
            description: createResponse.body.description,
            serviceType: createResponse.body.serviceType,
            serviceTier: createResponse.body.serviceTier,
            ownedBy: createResponse.body.ownedBy,
          },
        );

        const serviceId = createResponse.body.id;
        await xm.services.delete(serviceId);
        console.log(`[SUCCESS] Deleted service ${serviceId}`);
      } catch (err) {
        printError(`[FAIL] Experiment ${experiment.name}`, err);
      }
    }
  } catch (err) {
    printError('[ERROR] Services Endpoint Setup:', err);
  }
}
