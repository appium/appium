import axios from 'axios';
import { CancellationError } from 'bluebird';
import EventEmitter from 'node:events';

const CANCEL_EVENT = 'cancel';
const FINISH_EVENT = 'finish';

export class ProxyRequest {
  private readonly _requestConfig: axios.RawAxiosRequestConfig;
  private readonly _ee: EventEmitter;
  private _resultPromise: Promise<any> | null;

  constructor(requestConfig: axios.RawAxiosRequestConfig<any>) {
    this._requestConfig = requestConfig;
    this._ee = new EventEmitter();
    this._resultPromise = null;
  }

  async execute(): Promise<axios.AxiosResponse> {
    if (this._resultPromise) {
      return await this._resultPromise;
    }

    try {
      this._resultPromise = Promise.race([
        this._makeRacingTimer(),
        this._makeRequest(),
      ]);
      return await this._resultPromise;
    } finally {
      this._ee.emit(FINISH_EVENT);
      this._ee.removeAllListeners();
    }
  }

  cancel(): void {
    this._ee.emit(CANCEL_EVENT);
  }

  private async _makeRequest(): Promise<axios.AxiosResponse> {
    return await axios(this._requestConfig);
  }

  private async _makeRacingTimer(): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._ee.once(FINISH_EVENT, resolve);
      this._ee.once(CANCEL_EVENT, () => reject(new CancellationError(
        'The request has been cancelled'
      )));
    });
  }
}
