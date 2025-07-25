import { XmApi } from '../../../src/index.ts';
import config from '../../config.ts';
import printError from '../printError.ts';
import type { Service } from '../../../src/endpoints/services/types.ts';

async function createService(xm: XmApi, name: string): Promise<Service> {
  const createResponse = await xm.services.save({ targetName: name });
  return createResponse.body;
}

export default async function testServicesUpdate() {
  console.log('\n=== Test Services Endpoint (Update) ===');
  try {
    const xm = new XmApi(config.basicAuth);
    const marvel = await xm.groups.getByIdentifier('Marvel');

    const experiments = [
      {
        name: '1: Update targetName',
        getPayload: (service: Service) => ({
          id: service.id,
          targetName: `Updated Service Name ${Date.now()}`,
        }),
      },
      {
        name: '2: Update description',
        getPayload: (service: Service) => ({
          id: service.id,
          description: 'A new description',
        }),
      },
      {
        name: '3: Update serviceType',
        getPayload: (service: Service) => ({
          id: service.id,
          serviceType: 'TECHNICAL',
        }),
      },
      {
        name: '4: Update serviceTier',
        getPayload: (service: Service) => ({
          id: service.id,
          serviceTier: 'BRONZE',
        }),
      },
      {
        name: "5: Update ownedBy to a Group ID (string) - e.g., '...' ",
        getPayload: (service: Service) => ({
          id: service.id,
          ownedBy: marvel.body.id,
        }),
      },
      {
        name: "6: Update ownedBy to a Group Name (string) - e.g., 'Marvel'",
        getPayload: (service: Service) => ({
          id: service.id,
          ownedBy: marvel.body.targetName,
        }),
      },
      {
        name: "7: Update ownedBy to a Group ID (object) - e.g., { id: '...' }",
        getPayload: (service: Service) => ({
          id: service.id,
          ownedBy: { id: marvel.body.id },
        }),
      },
      {
        name: "8: Update ownedBy to a Group Name (object) - e.g., { targetName: '...' }",
        getPayload: (service: Service) => ({
          id: service.id,
          ownedBy: { targetName: marvel.body.targetName },
        }),
      },
      {
        name: '9: Update all properties',
        getPayload: (service: Service) => ({
          id: service.id,
          targetName: `Updated Service Name ${Date.now()}`,
          description: 'An updated description for everything.',
          serviceType: 'APPLICATION',
          serviceTier: 'PLATINUM',
          ownedBy: { id: marvel.body.id },
        }),
      },
      {
        name: '10: Invalid serviceType value',
        getPayload: (service: Service) => ({
          id: service.id,
          serviceType: 'INVALID_TYPE',
        }),
      },
      {
        name: '11: Invalid serviceTier value',
        getPayload: (service: Service) => ({
          id: service.id,
          serviceTier: 'INVALID_TIER',
        }),
      },
    ];

    for (const experiment of experiments) {
      let serviceToUpdate: Service | null = null;
      console.log(`\n--- Experiment ${experiment.name} ---`);
      try {
        serviceToUpdate = await createService(xm, `Test Service ${Date.now()}`);
        const payload = experiment.getPayload(serviceToUpdate);

        // The method might have type errors with some payloads,
        // so we use 'as any' to bypass them for the experiment
        // deno-lint-ignore no-explicit-any
        const updateResponse = await xm.services.save(payload as any);
        console.log(
          '[SUCCESS] Update Service:',
          updateResponse.status,
          {
            id: updateResponse.body.id,
            targetName: updateResponse.body.targetName,
            description: updateResponse.body.description,
            serviceType: updateResponse.body.serviceType,
            serviceTier: updateResponse.body.serviceTier,
            ownedBy: updateResponse.body.ownedBy,
          },
        );
      } catch (err) {
        printError(`[FAIL] Experiment ${experiment.name}`, err);
      } finally {
        if (serviceToUpdate) {
          await xm.services.delete(serviceToUpdate.id);
          console.log(`[SUCCESS] Deleted service ${serviceToUpdate.id}`);
        }
      }
    }

    // --- Special case: update non-existent service ---
    console.log(`\n--- Experiment 12: Try to update with a non-existent ID ---`);
    try {
      const payload = {
        id: '00000000-0000-0000-0000-000000000000',
        targetName: 'This should fail',
      };
      const res = await xm.services.save(payload);
      console.log('[FAIL] Update Service: Expected to fail but succeeded.', res);
    } catch (err) {
      printError('[SUCCESS] Experiment 12: Correctly failed to update non-existent service', err);
    }
  } catch (err) {
    printError('[ERROR] Services Update Endpoint Setup:', err);
  }
}
