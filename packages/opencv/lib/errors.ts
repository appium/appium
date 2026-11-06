/** Base class of the typed errors of this package; match by `instanceof` or {@link OpenCvError.code}. */
export class OpenCvError extends Error {
  /** Stable machine-readable identifier, e.g. `APPIUMERR_NO_IMAGE_MATCHES` */
  readonly code: string;

  constructor(message: string, options?: ErrorOptions & {code?: string}) {
    super(message, options);
    this.name = new.target.name;
    this.code = options?.code ?? 'APPIUMERR_OPENCV';
  }
}

/** Thrown when OpenCV bindings are used before {@link initOpenCv} has completed. */
export class OpenCvNotInitializedError extends OpenCvError {
  constructor(message: string = 'OpenCV is not initialized.', options?: ErrorOptions) {
    super(message, {...options, code: 'APPIUMERR_OPENCV_NOT_INITIALIZED'});
  }
}

/** Thrown when an unsupported option value or incompatible input images are provided. */
export class InvalidArgumentError extends OpenCvError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {...options, code: 'APPIUMERR_OPENCV_INVALID_ARGUMENT'});
  }
}

/** Thrown by {@link getImagesMatches} when no feature matches are found between the images. */
export class NoImageMatchesError extends OpenCvError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {...options, code: 'APPIUMERR_NO_IMAGE_MATCHES'});
  }
}

/** Thrown by {@link getImageOccurrence} when the partial image is not found in the full image. */
export class NoImageOccurrencesError extends OpenCvError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {...options, code: 'APPIUMERR_NO_IMAGE_OCCURRENCES'});
  }
}
