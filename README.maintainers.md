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
2. **Define types** in `types.ts` for the endpoint's request/response models
3. **Implement the endpoint class** using `ResourceClient` for HTTP operations in `index.ts`
   (standard pattern - oauth endpoint is a rare and justified exception)
4. **Export from the main index.ts** to make it available to consumers

✨ **AI-Assisted Development Workflow**

To streamline endpoint creation, use these AI assistant prompts in sequence:

1. **`/extract-xmapi-endpoint-documentation`** - Extract and format official API documentation into a markdown file for reference in subsequent prompts.

2. **`/new-endpoint`** - Generate the initial endpoint implementation (types, class, and exports) based on the extracted documentation.

3. **`/docs-vs-irl`** - Create validation scenarios that test the endpoint against real API responses, then update the endpoint code based on the observed real behavior to fix any discrepancies with the documentation.

#### ✨ The `/extract-xmapi-endpoint-documentation` prompt

1. **Initiate the process**:

    In VS Code, start a new chat with your A.I. assistant and type:
    ```sh
    /extract-xmapi-endpoint-documentation <endpoint-online-doc>
    # e.g.: /extract-xmapi-endpoint-documentation https://help.xmatters.com/xmapi/#shifts 
    ```

2. **Verify the output**

    The LLM will be spinning its wheels for a short while but usually does a really good job in 1 shot. Still, proof-read a little.

#### ✨ The `/new-endpoint` prompt

1. **Initiate the process**:
   
    In VS Code, start a new chat with your A.I. assistant and type `/new-endpoint` to begin.

2. **Provide details**:

    The assistant will guide you through creating the necessary files and code, asking for the endpoint name and its official documentation if you didn't provide them in the prompt.

    ```sh
    /new-endpoint <endpoint-name> <endpoint-doc-file>
    # e.g.: /new-endpoint shifts #file:xmapi-official-documentation.md
    ```

#### ❌✨ `xm-endpoint` VS Code Snippet

If you're not in the mood for an A.I. prompt, there is a code snippet for kickstarting the content
of an endpoint `index.ts` file.

**Usage:**

1. In a new TypeScript file, type `xm-endpoint` and press Tab
2. Fill in the placeholders and press Tab
   - `$1`: Resource name (PascalCase, e.g., "Person", "Device")
   - `$2`: Auto-generated lowercase version for comments
   - `$3`: Auto-generated lowercase version for URL path (usually same as $2)

#### ✨ Validating API Behavior Against Documentation 📄

> **Prerequisites**: Before running validation scenarios, ensure you have configured your
> credentials in `sandbox/config.ts` (see [sandbox readme here](sandbox/README.md)). These scenarios
> will create and delete data, so it is crucial to use a development or test instance that you do
> not mind writing to.

To `ensure the SDK aligns with the API's real-world behavior`, you can generate and run validation
scenarios. This process uses a dedicated prompt to create a test file that calls the live API and
logs its responses.

1. **Initiate the validation**:
   - In VS Code, start a new chat with your A.I. assistant and type `/docs-vs-irl` to begin the
     process.

2. **Provide details**: If you don't provide it, the assistant will ask you for:
   - The method name to test (e.g., `save`, `getByIdentifier`).
   - The endpoint name (e.g., `services`, `people`).
   - The path to the markdown file containing the official documentation for the endpoint. (Use `#`
     to add the file to the assistant's context).

3. **Review the changes**: The assistant will:
   - Create a new scenario file under `sandbox/scenarios/`.
   - Modify `sandbox/index.ts` to import and run your new scenario.

4. **Run the scenario**: Execute the sandbox to see the live API responses. The assistant is
   supposed to suggest it, but you can also DIY:
   ```bash
   deno task sandbox
   ```

This process helps you discover discrepancies between the documentation and the actual API behavior,
allowing you to build a more robust and reliable SDK based in truth and reality.

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
