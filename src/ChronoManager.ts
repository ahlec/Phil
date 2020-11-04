import * as moment from 'moment';

import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Chronos, { Chrono } from './chronos/index';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import ServerDirectory from './server-directory';
import GlobalConfig from './GlobalConfig';

const Definition = new LoggerDefinition('Chrono Manager');

export type ChronoProcessingResult =
  | {
      error: string;
      success: false;
      shouldReportOnRoutineProcessing: boolean;
    }
  | {
      didRunChrono: boolean;
      success: true;
    };

export default class ChronoManager extends Logger {
  private readonly channelsLastMessageTable: { [channelId: string]: Date };
  private hasBeenStarted: boolean;
  private readonly chronos: { [handle: string]: Chrono | undefined } = {};
  private readonly chronoIdsToHandles: {
    [databaseId: number]: string | undefined;
  } = {};

  constructor(
    private readonly discordClient: Client,
    private readonly db: Database,
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
      this.chronoIdsToHandles[chrono.databaseId] = chrono.handle;
      this.write(` > Registered '${chrono.handle}'.`);
    }

    setInterval(this.processChronos, 1000 * 60 * 15); // Run every 15 minutes
    this.processChronos(); // Also run at startup to make sure you get anything that ran earlier that day
  }

  public isRegisteredChrono(handle: string): boolean {
    return !!this.chronos[handle];
  }

  public getChronoHandleFromDatabaseId(chronoId: number): string | null {
    const handle = this.chronoIdsToHandles[chronoId];
    if (typeof handle === 'string') {
      return handle;
    }

    return null;
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

  public forceRunChrono(
    chronoHandle: string,
    server: Server
  ): Promise<ChronoProcessingResult> {
    const chrono = this.chronos[chronoHandle];
    if (!chrono) {
      throw new Error(`Attempted to force an invalid chrono '${chronoHandle}'`);
    }

    const now = moment.utc();
    const date = now.format('YYYY-M-DD');
    return this.processChronoInstance(
      now,
      chronoHandle,
      chrono.databaseId,
      server.id,
      date
    );
  }

  private processChronos = async (): Promise<void> => {
    const now = moment.utc();
    const hour = now.hours();
    const date = now.format('YYYY-M-DD');
    this.write(`processing chronos with UTC hour = ${hour} on UTC ${date}'`);

    const results = await this.db.query<{
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

    const botManager = this.discordClient.getUser(
      GlobalConfig.botManagerUserId
    );

    await Promise.all(
      results.rows.map(
        async (dbRow): Promise<void> => {
          const results = await this.processChronoInstance(
            now,
            dbRow.chrono_handle,
            parseInt(dbRow.chrono_id, 10),
            dbRow.server_id,
            date
          );

          if (results.success || !results.shouldReportOnRoutineProcessing) {
            return;
          }

          if (!botManager) {
            this.error(results.error);
            return;
          }

          await botManager.sendDirectMessage({
            color: 'red',
            description: results.error,
            fields: [
              {
                name: 'server ID',
                value: dbRow.server_id,
              },
              {
                name: 'chrono handle',
                value: dbRow.chrono_handle,
              },
            ],
            footer: null,
            title: ':no_entry: Scheduled chrono execution error',
            type: 'embed',
          });
        }
      )
    );
  };

  private async processChronoInstance(
    now: moment.Moment,
    chronoHandle: string,
    chronoId: number,
    serverId: string,
    utcDate: string
  ): Promise<ChronoProcessingResult> {
    this.write(`Executing ${chronoHandle} for serverId ${serverId}`);

    const server = this.discordClient.getServer(serverId);
    if (!server) {
      return {
        error: `Attempted to process '${chronoHandle}' for server '${serverId}', but I could not find it.`,
        shouldReportOnRoutineProcessing: false,
        success: false,
      };
    }

    const serverConfig = await this.serverDirectory.getServerConfig(server);
    if (!serverConfig) {
      return {
        error: `Phil is no longer part of server '${serverId}'.`,
        shouldReportOnRoutineProcessing: false,
        success: false,
      };
    }

    const chronoDefinition = this.chronos[chronoHandle];
    if (!chronoDefinition) {
      return {
        error: `Could not find chrono '${chronoHandle}'.`,
        shouldReportOnRoutineProcessing: true,
        success: false,
      };
    }

    try {
      let shouldProcess = true;
      if (chronoDefinition.requiredFeature) {
        shouldProcess = await chronoDefinition.requiredFeature.getIsEnabled(
          this.db,
          serverId
        );
      }

      if (shouldProcess) {
        await chronoDefinition.process(
          this.discordClient,
          this.db,
          server,
          serverConfig,
          now
        );
      }

      await this.db.query(
        `UPDATE server_chronos
              SET date_last_ran = $1
              WHERE server_id = $2 AND chrono_id = $3`,
        [utcDate, serverId, chronoId]
      );

      return {
        didRunChrono: shouldProcess,
        success: true,
      };
    } catch (err) {
      return {
        error: `Encountered an error when processing the chrono: ${
          err instanceof Error ? err.message : JSON.stringify(err)
        }`,
        shouldReportOnRoutineProcessing: true,
        success: false,
      };
    }
  }
}
