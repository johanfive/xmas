export default function printError(context: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`${context}: Error:`, err.message);
  } else {
    console.error(`${context}: Error:`, err);
  }
}
