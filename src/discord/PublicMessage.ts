import * as DiscordIO from 'discord.io';

import { wait } from '@phil/utils/delay';

import { Snowflake } from './types';
import { isRateLimitErrorResponse } from './utils';
import Channel from './Channel';
import Server from './Server';

export default class PublicMessage {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    private readonly serverId: Snowflake,
    private readonly channelId: Snowflake,
    public readonly messageId: Snowflake
  ) {}

  public get server(): Server {
    const rawServer = this.discordIOClient.servers[this.serverId];
    if (!rawServer) {
      throw new Error('Server is no longer accessible');
    }

    return new Server(this.discordIOClient, this.serverId);
  }

  public get channel(): Channel {
    const rawServer = this.discordIOClient.servers[this.serverId];
    if (!rawServer) {
      throw new Error('Server is no longer accessible');
    }

    const rawChannel = rawServer.channels[this.channelId];
    if (!rawChannel) {
      throw new Error('Channel is no longer accesible');
    }

    return new Channel(this.discordIOClient, this.serverId, this.channelId);
  }

  public edit(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.editMessage(
        {
          channelID: this.channelId,
          message: text,
          messageID: this.messageId,
        },
        err => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  public pin(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.pinMessage(
        {
          channelID: this.channelId,
          messageID: this.messageId,
        },
        err => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  public addReaction(reaction: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.addReaction(
        {
          channelID: this.channelId,
          messageID: this.messageId,
          reaction,
        },
        err => {
          if (err) {
            if (
              err.statusCode === 429 &&
              isRateLimitErrorResponse(err.response)
            ) {
              const { retry_after: waitTime } = err.response;
              if (waitTime) {
                wait(waitTime)
                  .then(() => this.addReaction(reaction))
                  .then(resolve);
                return;
              }
            }

            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  public removeClientsReaction(reaction: string): Promise<void> {
    return this.removeUsersReaction(this.discordIOClient.id, reaction);
  }

  public removeUsersReaction(
    userId: Snowflake,
    reaction: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.removeReaction(
        {
          channelID: this.channelId,
          messageID: this.messageId,
          reaction,
          userID: userId,
        },
        err => {
          if (err) {
            if (
              err.statusCode === 429 &&
              isRateLimitErrorResponse(err.response)
            ) {
              const { retry_after: waitTime } = err.response;
              if (waitTime) {
                wait(waitTime)
                  .then(() => this.removeUsersReaction(userId, reaction))
                  .then(resolve);
                return;
              }
            }

            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  public delete(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.deleteMessage(
        {
          channelID: this.channelId,
          messageID: this.messageId,
        },
        err => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }
}
