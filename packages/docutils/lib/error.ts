export class DocutilsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
