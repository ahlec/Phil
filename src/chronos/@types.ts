import { Moment } from 'moment';

import Server from '@phil/discord/Server';

import Feature from '@phil/features/feature';
import Phil from '@phil/phil';
import ServerConfig from '@phil/server-config';

export default interface Chrono {
  readonly handle: string;
  readonly requiredFeature: Feature | null;

  process(
    phil: Phil,
    server: Server,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void>;
}

export { default as Logger } from '@phil/Logger';
export { default as LoggerDefinition } from '@phil/LoggerDefinition';
