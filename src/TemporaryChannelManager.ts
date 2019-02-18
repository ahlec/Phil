import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import TemporaryChannel from './TemporaryChannel';

const POLLING_TIME_MILLISECONDS = 15 * 60 * 1000;

export default class TemporaryChannelManager extends Logger {
  private pollingInterval: NodeJS.Timeout;

  constructor(
    private readonly client: DiscordIOClient,
    private readonly database: Database
  ) {
    super(new LoggerDefinition('Temporary Channel Manager'));
  }

  public start() {
    if (this.pollingInterval) {
      return;
    }

    this.write(`Beginning polling every ${POLLING_TIME_MILLISECONDS}ms`);
    this.pollingInterval = setInterval(
      this.scanForCleanup,
      POLLING_TIME_MILLISECONDS
    );
    this.scanForCleanup();
  }

  private scanForCleanup = async () => {
    this.write('Scanning for cleanup...');
    const now = new Date();
    const channelsToDelete = await this.database.query<{
      channel_id: string;
      server_id: string;
    }>(
      `SELECT
        channel_id,
        server_id
      FROM
        temporary_channels
      WHERE
        deletion_time <= $1`,
      [now]
    );
    this.write(`  > Deleting ${channelsToDelete.rowCount} channels.`);
    for (const { channel_id, server_id } of channelsToDelete.rows) {
      await this.deleteChannel(channel_id, server_id);
    }

    const channelsToHide = await this.database.query<{
      channel_id: string;
      server_id: string;
    }>(
      `SELECT
        channel_id,
        server_id
      FROM
        temporary_channels
      WHERE
        expiration <= $1 AND
        has_hidden = E'0'`,
      [now]
    );
    this.write(`  > Hiding ${channelsToHide.rowCount} channels.`);
    for (const { channel_id, server_id } of channelsToHide.rows) {
      await this.hideChannel(channel_id, server_id);
    }
  };

  private async deleteChannel(channelId: string, serverId: string) {
    this.write(
      `    - Deleting temporary channel ${channelId} on server ${serverId}.`
    );

    const tempChannel = await this.getTemporaryChannelOrDeleteFromDb(
      channelId,
      serverId
    );
    if (!tempChannel) {
      return;
    }

    try {
      const success = await tempChannel.deleteChannel(
        this.client,
        this.database
      );
      if (!success) {
        this.error(
          `Could not delete channel ${channelId} on server ${serverId}`
        );
        return;
      }

      this.write(`      - Success.`);
    } catch (e) {
      this.error(
        `Error trying to delete channel ${channelId} on server ${serverId}`
      );
      this.error(e);
    }
  }

  private async hideChannel(channelId: string, serverId: string) {
    this.write(
      `    - Hiding temporary channel ${channelId} on server ${serverId} due to expiration.`
    );

    const tempChannel = await this.getTemporaryChannelOrDeleteFromDb(
      channelId,
      serverId
    );
    if (!tempChannel) {
      return;
    }

    try {
      const success = await tempChannel.hideChannel(this.client, this.database);
      if (!success) {
        this.error(`Could not hide channel ${channelId} on server ${serverId}`);
        return;
      }

      this.write(`      - Success.`);
    } catch (e) {
      this.error(
        `Error trying to hide channel ${channelId} on server ${serverId}`
      );
      this.error(e);
    }
  }

  private async getTemporaryChannelOrDeleteFromDb(
    channelId: string,
    serverId: string
  ): Promise<TemporaryChannel | null> {
    try {
      const server = await this.getServerOrDeleteFromDb(channelId, serverId);
      if (!server) {
        return null;
      }

      const tempChannel = await TemporaryChannel.get(
        this.database,
        channelId,
        server
      );
      if (!tempChannel) {
        this.error(
          `  > Channel ${channelId} on server ${serverId} could not be retrieved. Deleting from database.`
        );
        this.deleteFromDb(channelId, serverId);
        return null;
      }

      return tempChannel;
    } catch (e) {
      this.error(
        `Encountered an error when retrieving channel ${channelId} on server ${serverId}. Not deleting from database.`
      );
      this.error(e);
      return null;
    }
  }

  private async getServerOrDeleteFromDb(
    channelId: string,
    serverId: string
  ): Promise<DiscordIOServer | null> {
    try {
      const server = this.client.servers[serverId];
      if (server) {
        return server;
      }

      this.write(
        `  > I no longer appear to be in server ${serverId}. Deleting database record for channel ${channelId}.`
      );
      const success = await this.deleteFromDb(channelId, serverId);
      if (success) {
        return null;
      }

      this.error(
        `  > There were no database records for channel ${channelId} on server ${serverId}.`
      );
      return null;
    } catch (e) {
      this.error(e);
      return null;
    }
  }

  private async deleteFromDb(
    channelId: string,
    serverId: string
  ): Promise<boolean> {
    const recordsDeleted = await this.database.execute(
      `DELETE FROM
          temporary_channels
        WHERE
          channel_id = $1 AND
          server_id = $2`,
      [channelId, serverId]
    );
    return recordsDeleted >= 1;
  }
}
