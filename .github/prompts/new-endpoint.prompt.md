---
mode: 'agent'
model: Gemini 2.5 Pro Preview (Gemini)
tools: ['codebase', 'editFiles']
description: 'Guides the creation of a new API endpoint, from type definitions to client integration.'
---

You are an expert TypeScript developer working on the xMatters API client library (`xmApi`). Your
goal is to scaffold a new API endpoint, following the established patterns and conventions of the
project.

Adhere to the development guidelines in the project's
[copilot-instructions.md](../../.github/copilot-instructions.md).

### Instructions

1. **Gather Information**:
   - Ask for the name of the new endpoint (e.g., "devices", "audits").
   - Ask for the official API documentation for the new endpoint. This is required to define the
     types accurately.

2. **Scaffold Endpoint Files**:
   - Create a new directory under `src/endpoints/` named after the new endpoint.
   - Inside the new directory, create two files: `index.ts` and `types.ts`.

3. **Define Types**:
   - In the new `types.ts` file, draft the necessary TypeScript interfaces based on the provided API
     documentation.
   - Leverage the reusable, common types available in the `src/core/types/` directories whenever
     possible.
   - Use an existing endpoint's `types.ts` file (e.g., `src/endpoints/services/types.ts`) as a
     reference to ensure a consistent style for properties and naming conventions.

4. **Implement Endpoint Class**:
   - In the new `index.ts` file, implement the endpoint class. **The class must not extend any other
     class**. The `src/endpoints/services/index.ts` file is a solid example to follow.
   - There are two approved patterns for the constructor. You must use the **Standard Pattern**
     unless there is a clear and justifiable reason to use the Exception Pattern.

   - **The Standard Pattern (99% of cases)**:
     - Use this for any standard RESTful resource.
     - The class composes `ResourceClient` to handle HTTP operations.
     - The constructor receives a `RequestHandler` and uses it to instantiate a `ResourceClient`
       with the endpoint-specific URL path.

     ```typescript
     import type { RequestHandler } from '../../core/request-handler.ts';
     import { ResourceClient } from '../../core/resource-client.ts';
     import type { Pagination, Uuid } from '../../core/types/index.ts';
     import type { NewType, Type } from './types.ts';

     export class NewEndpointNameEndpoint {
       private readonly http: ResourceClient;

       constructor(http: RequestHandler) {
         this.http = new ResourceClient(http, '/new-endpoint-name');
       }

       // Methods will use this.http.get(), this.http.post(), etc.
     }
     ```

   - **The Exception Pattern (Rare and Justified)**:
     - Use this only for non-standard endpoints (like OAuth) where the `ResourceClient` abstraction
       is not suitable.
     - The class receives and stores the `RequestHandler` directly.

     ```typescript
     import type { RequestHandler } from '../../core/request-handler.ts';

     export class NewEndpointNameEndpoint {
       constructor(
         private readonly http: RequestHandler,
       ) {}

       // Methods will use this.http.get(), this.http.post(), etc.
     }
     ```

   - **Common Methods**:
     - While not a strict rule, most standard endpoints should implement the following default
       methods if the API supports them:
     - `get()`: To fetch a list of resources (paginated).
     - `getByIdentifier(id)`: To fetch a single resource by its ID or name.
     - `save(payload)`: Creates a new resource or updates an existing one. The payload determines
       the action: provide an `id` to update, or omit the `id` and provide a `targetName` (usually)
       to create.
     - `delete(id)`: To remove a resource.

   - **type and lint check**:
     - Ensure the new endpoint compiles without type errors and passes lint checks.
     - Run `deno check` and `deno lint` to verify.

5. **Export New Endpoint**:
   - Finally, open `src/index.ts` and add the new endpoint to the `XmApi` class.
   - Import the new endpoint class.
   - Add a new property to the `XmApi` class, instantiating the new endpoint client in the
     constructor.
   - Ensure the new property is exposed through the `xmApi` factory function.

### Out of Scope

- **Unit Tests**: Do not create or modify any unit tests. This task is strictly for scaffolding the
  endpoint's production code. Testing will be handled in a separate process.
