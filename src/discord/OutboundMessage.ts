import { Client as DiscordIOClient } from 'discord.io';

import Message from './Message';
import TextChannel from './TextChannel';
import UsersDirectMessagesChannel from './UsersDirectMessagesChannel';

import { wait } from '@phil/utils/delay';
import { isIndexableObject } from '@phil/utils/type-guards';

function isRateLimitError(
  err: unknown
): err is { statusCode: 429; response: { retry_after: number } } {
  if (!isIndexableObject(err)) {
    return false;
  }

  const { statusCode, response } = err;
  if (statusCode !== 429) {
    return false;
  }

  if (!isIndexableObject(response)) {
    return false;
  }

  if (
    !('retry_after' in response) ||
    typeof response.retry_after !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * An OutboundMessage is any message that was sent by this bot (as opposed to any message
 * sent by any other user or any other bot). This is not limited to messages sent during
 * the lifetime of this process, however.
 */
class OutboundMessage extends Message {
  public constructor(
    internalClient: DiscordIOClient,
    public readonly channel: TextChannel | UsersDirectMessagesChannel,
    id: string
  ) {
    super(internalClient, id, channel.id);
  }

  public async addReaction(reaction: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.internalClient.addReaction(
          {
            channelID: this.channel.id,
            messageID: this.id,
            reaction,
          },
          (err): void => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          }
        );
      });
    } catch (err) {
      if (isRateLimitError(err)) {
        await wait(err.response.retry_after);
        await this.addReaction(reaction);
        return;
      }

      throw err;
    }
  }

  public async removeReaction(reaction: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.internalClient.removeReaction(
          {
            channelID: this.channel.id,
            messageID: this.id,
            reaction,
            userID: this.internalClient.id,
          },
          (err): void => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          }
        );
      });
    } catch (err) {
      if (isRateLimitError(err)) {
        await wait(err.response.retry_after);
        await this.removeReaction(reaction);
        return;
      }

      throw err;
    }
  }
}

export default OutboundMessage;
