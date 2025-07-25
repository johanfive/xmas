---
mode: 'agent'
model: Gemini 2.5 Pro Preview (Gemini)
tools: ['codebase', 'editFiles']
description: 'Generate a new scenario file in the sandbox to validate a given method of a given endpoint.'
---

Your goal is to confirm or refute the official documentation of the endpoint.

Ask for the method name, endpoint name and the documentation file if any of them is not provided.

Follow the standards established in the [sandbox](../../sandbox/) for creating new scenarios.
[servicesCreation.ts](../../sandbox//scenarios/validateSaveMethod/servicesCreation.ts) is a good
example of how to structure the scenario file.

Create a new file (and appropriate directory if necessary) in the
[sandbox/scenarios](../../sandbox/scenarios/) directory, named after the method and endpoint, e.g.,
validate${method}Method/${endpoint}Creation.ts or validate${method}Method/${endpoint}Update.ts,
depending on the action being validated (this example assumes the method is `save` which typically
can be used for both creation and update but use your best judgement based on the user input).

Ensure to import necessary modules and handle errors appropriately. Use the existing printError
function for error handling.

The API responses are intended for LLM consumption and must be reflective of the truth of the API's
behavior.

When done, offer the user to run the `deno task sandbox` command to execute the new scenario.

If the user agrees digest the resulting logs and ask the user if they want to update the types.ts
file for the endpoint under test.
