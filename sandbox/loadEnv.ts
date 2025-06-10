/**
 * Load environment variables from .env file if it exists (for local development)
 */
export async function loadEnvFile(): Promise<void> {
  try {
    // Look for .env file in the sandbox directory
    const envPath = new URL('.env', import.meta.url).pathname;
    const envContent = await Deno.readTextFile(envPath);
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          // Remove quotes if present and join value parts
          let value = valueParts.join('=').trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          // Only set if not already defined (environment variables take precedence)
          if (!Deno.env.get(key)) {
            Deno.env.set(key, value);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(
        'No .env file found in sandbox directory. Please copy .env.example to .env and configure your credentials.',
      );
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load environment variables from .env file: ${errorMessage}`);
    }
  }
}
