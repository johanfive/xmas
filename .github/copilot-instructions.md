This TypeScript project, built with Deno, is a library for JavaScript developers to consume the
xMatters API (aka `xmApi`).

### Project Priorities

1. **Good DX**:

- The library should provide a great developer experience (DX) for JavaScript and TypeScript
  developers who use it (consumers), and for those who develop it (maintainers).
- When these 2 priorities are at odds, the library should prioritize a good DX for consumers.
- It should be easy to use, with clear and concise APIs that are intuitive to understand.

2. **Consistency**:

- Code should be consistent in **style**, **structure**, and **behavior**.
- Follow consistent **naming conventions**, **error handling**, and **response structures**.

3. **Zero Dependencies**:

- Do not use any third-party libraries.
- Only use Deno’s standard library, and only for **unit testing**.

4. **Dependency Injection**:

- Consumers must be able to inject their own:
  - HTTP client
  - Logger
  - Any other external dependencies when applicable

5. **Type Safety**:

- Use TypeScript features when they add value, not just because you can.
- Avoid the non-null assertion operator (`!`) entirely.
- Prefer `null` over `undefined` when explicitly assigning absence of a value.

6. **Documentation**: The library should be well-documented, with clear examples and usage
   instructions.

### Development Guidelines

It should be extremely easy for the maintainers to add more endpoints in the future. The core logic
of how a request is built and sent should be abstracted away from the endpoint implementations.

- Do not make changes until you are **95% confident** in what needs to be built.
- Ask clarifying questions until you reach that level of confidence.

#### The Sandbox

- `/sandbox/index.ts` is for quick prototyping and testing.
- Though version controlled, this file is **not** part of the library shipped to consumers.
- Do **not** modify the sandbox unless explicitly instructed.
- Must be run with:

```bash
deno task sandbox
```

#### Unit Tests

- **Never** send real HTTP requests.
- Use _mocks_ or _stubs_ for all external interactions.
- Must be run with:

```bash
deno test
```
