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
- `deno task sandbox:validate-docs` - You should modify `sandbox/validate-docs.ts` to create
  AI-generated code that leverages the SDK to validate specific examples and behaviors from the
  official API documentation. Then, run this command to verify the implementation matches the
  documented behavior.

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
