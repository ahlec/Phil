import {
  DiscordAPIError,
  DMChannel as DiscordJSDMChannel,
  Message as DiscordJSMessage,
} from 'discord.js';

import OutboundMessage from './OutboundMessage';
import MessageTemplate from './MessageTemplate';

import { BaseChannel, SendMessageResult } from './types';
import { sendMessageTemplate } from './internals/sendMessageTemplate';

class UsersDirectMessagesChannel implements BaseChannel {
  public constructor(private readonly internalChannel: DiscordJSDMChannel) {}

  public get id(): string {
    return this.internalChannel.id;
  }

  public async getOutboundMessageById(
    messageId: string
  ): Promise<OutboundMessage | null> {
    let internalMessage: DiscordJSMessage;
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

export default UsersDirectMessagesChannel;
