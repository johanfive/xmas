This typescript project built with deno is meant to be a library for javascript developers to
consume the xMatters API (AKA xmApi).

The priorities for this project are:

1. **Consistency**: Both from the library maintainers' perspective and the library consumers'
   perspective, code should be consistent in style, structure, and behavior. This includes
   consistent naming conventions, error handling, and response structures.
2. **Zero Dependencies**: The library should not depend on any other libraries, except for Deno's
   standard library and even then, only for unit testing.
3. **Dependency Injection**: The consumer should be able to inject their own HTTP client, logger,
   and other dependencies.
4. **Type Safety**: The library should be fully type-safe, leveraging TypeScript's capabilities to
   ensure that consumers get the best developer experience. However, use TypeScript features when
   they add value, not just because you can. Also there should be zero non-null assertion operators
   (!) in the entire codebase. Finally, there are very few exceptions to this rule: whenever you
   feel compelled to explicitly specify `undefined`, use `null` instead.
5. **Documentation**: The library should be well-documented, with clear examples and usage
   instructions.

We need to implement something that will make it extremely easy for the maintainers to add more
endpoints in the future. The core logic of how a request is built and sent should be abstracted away
from the endpoint implementations.

For iterative development, you can make use of the /sandbox/index.ts file to test your code. This
file is not part of the library and is meant for quick prototyping and testing. Do not modify the
sandbox unless explicitly instructed to do so.

To run the sandbox, always prompt me to run the following command:

```bash
deno task sandbox
```

Unlike the sandbox, unit tests should not send actual HTTP requests over the network, ever.

Do not make any changes until you have 95% confidence that you know what to build. Ask me follow up
questions until you have that confidence.

To run unit tests, always prompt me to run the following command:

```bash
deno test
```

Sometimes the best solution is the one that requires the least code changes
