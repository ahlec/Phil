import {
  ClientRequest,
  createServer as createHttpServer,
  get as getHttp,
  IncomingMessage,
  Server as HttpServer,
  ServerResponse,
} from 'http';
import {
  createServer as createHttpsServer,
  get as getHttps,
  Server as HttpsServer,
} from 'https';
import { parse, resolve } from 'url';
import GlobalConfig from './global-config';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';

// Abstract away protocol from here forward.
const serverProtocol = parse(GlobalConfig.webportalUrl).protocol!.slice(0, -1);
type CreateServerResponseListener = (
  request: IncomingMessage,
  response: ServerResponse
) => void;
let createServer: (
  responseListener: CreateServerResponseListener
) => HttpServer | HttpsServer;
let get: (url: string, options: { port: number }) => ClientRequest;
switch (serverProtocol) {
  case 'http': {
    createServer = createHttpServer;
    get = getHttp;
    break;
  }
  case 'https': {
    createServer = (responseListener: CreateServerResponseListener) =>
      createHttpsServer({}, responseListener);
    get = getHttps;
    break;
  }
  default:
    throw new Error(
      `Unrecognized protocol for webportal url: '${serverProtocol}'`
    );
}

// Utility functions
function getEndpoint(endpoint: string): Promise<string> {
  const url = resolve(GlobalConfig.webportalUrl, endpoint);
  return new Promise((resolvePromise, reject) => {
    const request = get(url, { port: GlobalConfig.webportalPort });
    request.on('error', err => reject(err));
    request.on('response', (response: IncomingMessage) => {
      response.on('error', err => reject(err));
      response.on('data', (chunk: string | Buffer) =>
        resolvePromise(chunk.toString())
      );
    });
  });
}

// Class itself
export default class WebPortal extends Logger {
  private server: HttpServer | HttpsServer;

  constructor() {
    super(new LoggerDefinition('Web Portal'));
  }

  public start() {
    this.server = createServer(this.onRequest);

    this.write(`Creating an ${serverProtocol} server.`);

    this.server.listen(GlobalConfig.webportalPort);
    this.write(`Web server is running on port ${GlobalConfig.webportalPort}.`);
  }

  public beginKeepAliveHeartbeat() {
    // Ping the server every 12 minutes so that the Heroku dynos won't fall asleep
    setInterval(this.onKeepAliveHeartbeat, 1000 * 60 * 12);
  }

  private onRequest = (_: IncomingMessage, response: ServerResponse) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.write('Phil.');
    response.end();
  };

  private onKeepAliveHeartbeat = async () => {
    const response = await getEndpoint('/');
    this.write(`Heartbeat response: '${response}'`);
  };
}
