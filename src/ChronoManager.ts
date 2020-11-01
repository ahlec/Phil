import * as moment from 'moment';
import { inspect } from 'util';

import Server from '@phil/discord/Server';

import Chronos, { Chrono } from './chronos/index';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import Phil from './phil';
import ServerConfig from './server-config';
import ServerDirectory from './server-directory';
import { sendMessageTemplate } from './utils/discord-migration';

const Definition = new LoggerDefinition('Chrono Manager');

export default class ChronoManager extends Logger {
  private readonly channelsLastMessageTable: { [channelId: string]: Date };
  private hasBeenStarted: boolean;
  private readonly chronos: { [handle: string]: Chrono | undefined } = {};

  constructor(
    private readonly phil: Phil,
    private readonly serverDirectory: ServerDirectory
  ) {
    super(Definition);
    this.channelsLastMessageTable = {};
    this.hasBeenStarted = false;
  }

  public start(): void {
    if (this.hasBeenStarted) {
      return;
    }

    this.hasBeenStarted = true;
    this.write('Starting system.');

    for (const constructor of Chronos) {
      const chrono = new constructor(Definition);
      this.chronos[chrono.handle] = chrono;
      this.write(` > Registered '${chrono.handle}'.`);
    }

    setInterval(this.processChronos, 1000 * 60 * 15); // Run every 15 minutes
    this.processChronos(); // Also run at startup to make sure you get anything that ran earlier that day
  }

  public getMinutesSinceLastMessageInChannel(
    channelId: string,
    now: Date
  ): number {
    const minutesSinceLast = this.channelsLastMessageTable[channelId];
    if (!minutesSinceLast) {
      this.channelsLastMessageTable[channelId] = new Date(); // We'll set it here since we don't have a baseline but it helps us move past this section if the bot started out with the channel dead
      return 0;
    }

    const millisecondsDiff = Number(now) - Number(minutesSinceLast);
    if (millisecondsDiff <= 0) {
      return 0;
    }

    return Math.floor(millisecondsDiff / 1000 / 60);
  }

  public recordNewMessageInChannel(channelId: string): void {
    this.channelsLastMessageTable[channelId] = new Date();
  }

  private processChronos = async (): Promise<void> => {
    const now = moment.utc();
    const hour = now.hours();
    const date = now.format('YYYY-M-DD');
    this.write(`processing chronos with UTC hour = ${hour} on UTC ${date}'`);

    const results = await this.phil.db.query<{
      server_id: string;
      chrono_id: string;
      chrono_handle: string;
    }>(
      `SELECT
                sc.server_id,
                c.chrono_id,
                c.chrono_handle
            FROM server_chronos sc
            JOIN chronos c
                ON sc.chrono_id = c.chrono_id
            LEFT JOIN server_features sf
                ON c.required_feature_id = sf.feature_id AND sc.server_id = sf.server_id
            WHERE
                sc.is_enabled = E'1' AND
                c.utc_hour <= $1 AND
                (sf.is_enabled = E'1' OR sf.is_enabled IS NULL) AND
                (sc.date_last_ran IS NULL OR sc.date_last_ran < $2)
            ORDER BY
                c.utc_hour ASC`,
      [hour, date]
    );

    for (const dbRow of results.rows) {
      this.processChronoInstance(
        now,
        dbRow.chrono_handle,
        parseInt(dbRow.chrono_id, 10),
        dbRow.server_id,
        date
      );
    }
  };

  private async processChronoInstance(
    now: moment.Moment,
    chronoHandle: string,
    chronoId: number,
    serverId: string,
    utcDate: string
  ): Promise<void> {
    this.write(`Executing ${chronoHandle} for serverId ${serverId}`);

    const rawServer = this.phil.bot.servers[serverId];
    if (!rawServer) {
      this.error(
        `Attempted to process '${chronoHandle}' for server '${serverId}', but I could not find it.`
      );
      return;
    }

    const server = new Server(this.phil.bot, rawServer, rawServer.id);

    const serverConfig = await this.serverDirectory.getServerConfig(rawServer);
    if (!serverConfig) {
      this.write(`Phil is no longer part of server with serverId ${serverId}`);
      return;
    }

    const chronoDefinition = this.chronos[chronoHandle];
    if (!chronoDefinition) {
      this.error(`there is no chrono with the handle ${chronoHandle}`);
      return;
    }

    try {
      let shouldProcess = true;
      if (chronoDefinition.requiredFeature) {
        shouldProcess = await chronoDefinition.requiredFeature.getIsEnabled(
          this.phil.db,
          serverId
        );

        if (!shouldProcess) {
          this.write(
            `Feature ${chronoDefinition.requiredFeature.displayName} is disabled on server ${serverId}, skipping processing ${chronoDefinition.handle}.`
          );
        }
      }

      if (shouldProcess) {
        await chronoDefinition.process(this.phil, server, serverConfig, now);
      }

      await this.markChronoProcessed(chronoId, serverId, utcDate);
    } catch (err) {
      await this.reportChronoError(err, serverId, serverConfig, chronoHandle);
    }
  }

  private async markChronoProcessed(
    chronoId: number,
    serverId: string,
    utcDate: string
  ): Promise<void> {
    await this.phil.db.query(
      `UPDATE server_chronos
            SET date_last_ran = $1
            WHERE server_id = $2 AND chrono_id = $3`,
      [utcDate, serverId, chronoId]
    );
  }

  private async reportChronoError(
    err: Error | string,
    serverId: string,
    serverConfig: ServerConfig,
    chronoHandle: string
  ): Promise<void> {
    this.error(`error running ${chronoHandle} for server ${serverId}`);
    this.error(err);
    await sendMessageTemplate(
      this.phil.bot,
      serverConfig.botControlChannel.id,
      {
        color: 'red',
        description: inspect(err),
        fields: null,
        footer: 'chrono: ' + chronoHandle,
        title: ':no_entry: Chrono Error',
        type: 'embed',
      }
    );
  }
}
