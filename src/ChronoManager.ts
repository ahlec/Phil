import * as moment from 'moment';
import { inspect } from 'util';
import Chronos, { Chrono } from './chronos/index';
import EmbedColor from './embed-color';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import Phil from './phil';
import { DiscordPromises } from './promises/discord';
import ServerConfig from './server-config';
import ServerDirectory from './server-directory';

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

  public start() {
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

  public getMinutesSinceLastMessageInChannel(channelId: string, now: Date) {
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

  public recordNewMessageInChannel(channelId: string) {
    this.channelsLastMessageTable[channelId] = new Date();
  }

  private processChronos = () => {
    const now = moment.utc();
    const hour = now.hours();
    const date = now.format('YYYY-M-DD');
    this.write(`processing chronos with UTC hour = ${hour} on UTC ${date}'`);

    this.phil.db
      .query(
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
      )
      .then(results => {
        for (const dbRow of results.rows) {
          this.processChronoInstance(
            now,
            dbRow.chrono_handle,
            dbRow.chrono_id,
            dbRow.server_id,
            date
          );
        }
      });
  };

  private async processChronoInstance(
    now: moment.Moment,
    chronoHandle: string,
    chronoId: number,
    serverId: string,
    utcDate: string
  ) {
    this.write(`Executing ${chronoHandle} for serverId ${serverId}`);

    const server = this.phil.bot.servers[serverId];
    const serverConfig = await this.serverDirectory.getServerConfig(server);
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
          serverConfig.serverId
        );

        if (!shouldProcess) {
          this.write(
            `Feature ${
              chronoDefinition.requiredFeature.displayName
            } is disabled on server ${
              serverConfig.serverId
            }, skipping processing ${chronoDefinition.handle}.`
          );
        }
      }

      if (shouldProcess) {
        await chronoDefinition.process(this.phil, serverConfig, now);
      }

      this.markChronoProcessed(chronoId, serverId, utcDate);
    } catch (err) {
      this.reportChronoError(err, serverConfig, chronoHandle);
    }
  }

  private markChronoProcessed(
    chronoId: number,
    serverId: string,
    utcDate: string
  ) {
    return this.phil.db.query(
      `UPDATE server_chronos
            SET date_last_ran = $1
            WHERE server_id = $2 AND chrono_id = $3`,
      [utcDate, serverId, chronoId]
    );
  }

  private reportChronoError(
    err: Error | string,
    serverConfig: ServerConfig,
    chronoHandle: string
  ) {
    this.error(
      `error running ${chronoHandle} for server ${serverConfig.server.id}`
    );
    this.error(err);
    return DiscordPromises.sendEmbedMessage(
      this.phil.bot,
      serverConfig.botControlChannel.id,
      {
        color: EmbedColor.Error,
        description: inspect(err),
        footer: {
          text: 'chrono: ' + chronoHandle,
        },
        title: ':no_entry: Chrono Error',
      }
    );
  }
}
