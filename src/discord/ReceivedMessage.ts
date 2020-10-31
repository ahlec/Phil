import {
  SendMessageResult,
  sendMessageTemplate,
} from '@phil/utils/discord-migration';
import { Client as DiscordIOClient } from 'discord.io';
import MessageTemplate from './MessageTemplate';

/**
 * A ReceivedMessage is a base class for any message that was received by the
 * bot. This could be a message sent to a server that the bot is in, or a
 * direct message received by the bot.
 */
abstract class ReceivedMessage {
  public constructor(
    protected readonly internalClient: DiscordIOClient,
    public readonly id: string,
    public readonly body: string,
    private readonly channelId: string
  ) {}

  public respond(response: MessageTemplate): Promise<SendMessageResult> {
    return sendMessageTemplate(this.internalClient, this.channelId, response);
  }
}

export default ReceivedMessage;
