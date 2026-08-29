import axios from 'axios';
import type {AxiosResponse, RawAxiosRequestConfig} from 'axios';

export class ProxyRequest {
  private readonly _requestConfig: RawAxiosRequestConfig;
  private _resultPromise: Promise<AxiosResponse> | null;
  private _abortController: AbortController | null;
  private _cancelled: boolean;

  constructor(requestConfig: RawAxiosRequestConfig<any>) {
    this._requestConfig = requestConfig;
    this._resultPromise = null;
    this._abortController = null;
    this._cancelled = false;
  }

  async execute(): Promise<AxiosResponse> {
    if (this._resultPromise) {
      return await this._resultPromise;
    }

    const abortController = new AbortController();
    this._abortController = abortController;
    this._cancelled = false;

    try {
      this._resultPromise = this._makeRequest(abortController.signal);
      return await this._resultPromise;
    } finally {
      this._abortController = null;
    }
  }

  cancel(): void {
    this._cancelled = true;
    this._abortController?.abort();
  }

  private async _makeRequest(signal: AbortSignal): Promise<AxiosResponse> {
    try {
      return await axios({
        ...this._requestConfig,
        signal,
      });
    } catch (err) {
      if (this._cancelled && axios.isCancel(err)) {
        // The request was cancelled; do not propagate the error to callers.
        return await new Promise<AxiosResponse>(() => {});
      }
      throw err;
    }
  }
}
