import { Moment } from 'moment';

import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Database from '@phil/database';
import Feature from '@phil/features/feature';
import ServerConfig from '@phil/server-config';

export default interface Chrono {
  readonly handle: string;
  readonly databaseId: number;
  readonly requiredFeature: Feature | null;

  process(
    discordClient: Client,
    database: Database,
    server: Server,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void>;
}

export { default as Logger } from '@phil/Logger';
export { default as LoggerDefinition } from '@phil/LoggerDefinition';
