export class BundleError extends Error {
  constructor(message: string) {
    super(`bundle: ${message}`);
    this.name = "BundleError";
  }
}
