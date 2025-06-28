# xM API SDK JS

`xmas` for short 🎄

### Maintainers

> **Setup**: After cloning, run `deno install` to install and cache all dependencies.

> **VS Code Users**: When you first open this project, VS Code will suggest installing the Deno
> extension. Accept this suggestion to get proper TypeScript support, formatting, and linting as
> configured in the [.vscode/settings.json](.vscode/settings.json) file.

> **Corporate Networks**: If you're behind a corporate firewall (like Zscaler), you may encounter
> SSL certificate issues when downloading dependencies. Use the configured tasks instead of direct
> Deno commands:

**Development Commands**:

- `deno test` - Run all unit tests
- `deno task cache` - Cache dependencies (handles corporate certificates)
- `deno task sandbox` - Run sandbox for quick prototyping
- `deno task sandbox:validate-docs` - Validate SDK behavior against official API documentation (see
  Adding New Endpoints section)

**Alternative Commands** (if not behind corporate firewall):

- `deno cache --reload src/**/*.ts` - Cache dependencies

### Troubleshooting

**SSL Certificate Issues**: If you encounter errors like `invalid peer certificate: UnknownIssuer`
when running Deno commands, you're likely behind a corporate firewall that intercepts SSL
certificates.

**Solution**: Use the configured tasks which include `DENO_TLS_CA_STORE=system`:

```bash
deno task cache   # Instead of: deno cache --reload src/**/*.ts
```

**Manual Override**: For any other Deno command, prefix with the environment variable:

```bash
DENO_TLS_CA_STORE=system deno [your-command]
```

**Permanent Fix**: Add this to your shell profile (`~/.zshrc`):

```bash
export DENO_TLS_CA_STORE=system
```

### Adding New Endpoints

The library is designed to make adding new endpoints extremely easy. Each endpoint follows the same
pattern:

1. **Create a new directory** under `src/endpoints/` (e.g., `src/endpoints/people/`)
2. **Define types** in `types.ts` for the endpoint's request/response models Suggested prompt:
   ```
   Use the official api documentation from #file:official-documentation.md to draft the types in #file:types.ts in a style that aligns with that of #file:types [<-- point to the groups endpoint types]
   ```
3. **Implement the endpoint class** using `ResourceClient` for HTTP operations in `index.ts`
   (standard pattern - oauth endpoint is a rare and justified exception)\
   **Recommended**: Use the `xm-endpoint` VS Code snippet
4. **Export from the main index.ts** to make it available to consumers

#### `xm-endpoint` VS Code Snippet

A code snippet for kickstarting the content of an endpoint `index.ts` file.

**Usage:**

1. In a new TypeScript file, type `xm-endpoint` and press Tab
2. Fill in the placeholders and press Tab
   - `$1`: Resource name (PascalCase, e.g., "Person", "Device")
   - `$2`: Auto-generated lowercase version for comments
   - `$3`: Auto-generated lowercase version for URL path (usually same as $2)

#### Optional: Validate Against Official Documentation

As a maintainer, you can test whether the actual xMatters API behaves as documented:

1. Create a markdown file with the official API documentation for your endpoint
2. Ask an AI to modify `sandbox/validate-docs.ts` to use your new SDK endpoint to make real API
   calls
3. Run `deno task sandbox:validate-docs` to discover discrepancies between documentation and actual
   API behavior

This helps you adjust your SDK implementation to work with the real API, not just what the
documentation claims.

Here is a prompt you could use:

```
I'm implementing a new endpoint for an xMatters API SDK. I have the official API documentation for the "/bla" endpoint in [tag .md or .txt file here].

Please override the exisint validate-docs.ts file to use our SDK to make real API calls that will reveal any discrepancies between what the documentation claims and how the API actually behaves.
```

### Project Structure

```
src/
├── index.ts                 # Main entry point
├── core/                    # Core functionality
│   ├── request-handler.ts   # HTTP request management
│   ├── resource-client.ts   # Base class for endpoints
│   ├── errors.ts           # Error definitions
│   ├── defaults/           # Default implementations (httpClient and logger)
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Utility functions
└── endpoints/              # API endpoint implementations
    ├── groups/             # Groups API
    ├── oauth/              # OAuth API
    └── [new-endpoint]/     # Your new endpoint here
```

The core abstractions handle all the complex HTTP logic, authentication, retries, and error
handling - you just focus on the endpoint-specific business logic.
