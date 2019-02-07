import {
  ClientRequest,
  createServer as createHttpServer,
  get as getHttp,
  IncomingMessage,
  Server as HttpServer,
  ServerResponse,
} from 'http';
import { get as getHttps } from 'https';
import { parse, resolve } from 'url';
import GlobalConfig from './global-config';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';

// Abstract away protocol from here forward.
const serverProtocol = parse(GlobalConfig.webportalUrl).protocol!.slice(0, -1);
let get: (url: string) => ClientRequest;
switch (serverProtocol) {
  case 'http': {
    get = getHttp;
    break;
  }
  case 'https': {
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
    const request = get(url);
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
  private server: HttpServer;

  constructor() {
    super(new LoggerDefinition('Web Portal'));
  }

  public start() {
    this.server = createHttpServer(this.onRequest);

    this.write(`Creating an http server.`);

    this.server.listen(GlobalConfig.webportalPort);
    this.write(`Web server is running on port ${GlobalConfig.webportalPort}.`);
  }

  public beginKeepAliveHeartbeat() {
    // Ping the server every 10 minutes so that the Heroku dynos won't fall asleep
    setInterval(this.onKeepAliveHeartbeat, 1000 * 60 * 10);
  }

  private onRequest = (_: IncomingMessage, response: ServerResponse) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.write('Phil.');
    response.end();
  };

  private onKeepAliveHeartbeat = async () => {
    this.write('Making heartbeat request.');
    const response = await getEndpoint('/');
    this.write(`Heartbeat response: '${response}'`);
  };
}
