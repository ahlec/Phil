import { Client as DiscordIOClient } from 'discord.io';

import OutboundMessage from './OutboundMessage';

/**
 * A base class for all channels (public and private).
 */
abstract class BaseChannel {
  public constructor(
    protected readonly internalClient: DiscordIOClient,
    public readonly id: string
  ) {}

  /**
   * Fetches a message that was sent by this bot (whether in this session or a
   * previous session) in this channel, by the unique message Snowflake.
   *
   * If there is no message found, this will return `null`.
   *
   * @throws If the message was found, but was NOT sent by the bot. If the
   * message is not found, it will not throw an error.
   * @param messageId The snowflake for the message that was sent in this
   * channel, by this bot user.
   */
  public getOutboundMessageById(messageId: string): OutboundMessage | null {
    // TODO: Actually validate that the message exists.

    // TODO: Actually validate that the message was sent by the bot.

    return new OutboundMessage(this.internalClient, this, messageId);
  }
}

export default BaseChannel;
