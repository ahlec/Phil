import { Client as DiscordIOClient } from 'discord.io';

import Member from './Member';
import Message from './Message';
import MessageTemplate from './MessageTemplate';
import TextChannel from './TextChannel';
import { SendMessageResult } from './types';

import { sendMessageTemplate } from './internals/sendMessageTemplate';

class ReceivedServerMessage extends Message {
  public constructor(
    internalClient: DiscordIOClient,
    id: string,
    public readonly body: string,
    public readonly sender: Member,
    public readonly channel: TextChannel
  ) {
    super(internalClient, id, channel.id);
  }

  public respond(response: MessageTemplate): Promise<SendMessageResult> {
    return sendMessageTemplate(this.internalClient, this.channel, response);
  }
}

export default ReceivedServerMessage;
