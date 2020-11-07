import { Message as DiscordJsMessage } from 'discord.js';

/**
 * A base class for all messages (inbound and outbound, public and private).
 */
abstract class Message {
  public constructor(protected readonly internalMessage: DiscordJsMessage) {
    if (internalMessage.partial) {
      throw new Error(
        `Cannot construct a Message object with a partial message (ID: ${internalMessage.id})`
      );
    }
  }

  public get id(): string {
    return this.internalMessage.id;
  }

  public async delete(): Promise<void> {
    if (this.internalMessage.deleted) {
      throw new Error('This message has already been deleted.');
    }

    await this.internalMessage.delete();
  }
}

export default Message;
