import {
  Message as DiscordJsMessage,
  TextChannel as DiscordJsTextChannel,
} from 'discord.js';

import Member from './Member';
import Message from './Message';
import MessageTemplate from './MessageTemplate';
import TextChannel from './TextChannel';
import { SendMessageResult } from './types';

import { sendMessageTemplate } from './internals/sendMessageTemplate';
import OutboundMessage from './OutboundMessage';

class ReceivedServerMessage extends Message {
  public constructor(
    internalMessage: DiscordJsMessage,
    private readonly internalChannel: DiscordJsTextChannel,
    public readonly sender: Member,
    public readonly channel: TextChannel
  ) {
    super(internalMessage);
  }

  public get body(): string {
    return this.internalMessage.content;
  }

  public async respond(response: MessageTemplate): Promise<SendMessageResult> {
    const finalInternalMessage = await sendMessageTemplate(
      this.internalChannel,
      response
    );
    return {
      finalMessage: new OutboundMessage(finalInternalMessage, this.channel),
    };
  }
}

export default ReceivedServerMessage;
