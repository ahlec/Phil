import { Client as DiscordIOClient } from 'discord.io';

/**
 * A base class for all messages (inbound and outbound, public and private).
 */
abstract class Message {
  public constructor(
    protected readonly internalClient: DiscordIOClient,
    public readonly id: string,
    protected readonly channelId: string
  ) {}

  public delete(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.internalClient.deleteMessage(
        {
          channelID: this.channelId,
          messageID: this.id,
        },
        (err) => {
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

export default Message;
