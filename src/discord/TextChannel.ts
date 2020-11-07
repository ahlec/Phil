import {
  DiscordAPIError,
  Message as DiscordJsMessage,
  TextChannel as DiscordJsTextChannel,
} from 'discord.js';

import MessageTemplate from './MessageTemplate';
import OutboundMessage from './OutboundMessage';
import Server from './Server';

import { BaseChannel, SendMessageResult } from './types';
import { sendMessageTemplate } from './internals/sendMessageTemplate';

class TextChannel implements BaseChannel {
  public constructor(
    private readonly internalChannel: DiscordJsTextChannel,
    public readonly server: Server
  ) {}

  public get id(): string {
    return this.internalChannel.id;
  }

  public get name(): string {
    return this.internalChannel.name;
  }

  public async getOutboundMessageById(
    messageId: string
  ): Promise<OutboundMessage | null> {
    let internalMessage: DiscordJsMessage;
    try {
      internalMessage = await this.internalChannel.messages.fetch(messageId);
    } catch (err) {
      if (err instanceof DiscordAPIError && err.httpStatus === 404) {
        return null;
      }

      throw err;
    }

    if (internalMessage.author.id !== this.internalChannel.client.user?.id) {
      throw new Error(
        `The message (ID: ${messageId}) was not a message sent by this bot.`
      );
    }

    return new OutboundMessage(internalMessage, this);
  }

  public async sendMessage(
    template: MessageTemplate
  ): Promise<SendMessageResult> {
    const finalRawMessage = await sendMessageTemplate(
      this.internalChannel,
      template
    );
    return {
      finalMessage: new OutboundMessage(finalRawMessage, this),
    };
  }
}

export default TextChannel;
