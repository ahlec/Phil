import { Message as DiscordJsMessage } from 'discord.js';

import Message from './Message';
import MessageTemplate from './MessageTemplate';
import User from './User';
import { SendMessageResult } from './types';

class ReceivedDirectMessage extends Message {
  public readonly sender: User;

  public constructor(internalMessage: DiscordJsMessage) {
    super(internalMessage);

    if (internalMessage.author.partial) {
      throw new Error(
        `Cannot construct a ReceivedDirectMessage (ID: ${internalMessage.id}) with a partial author (ID: ${internalMessage.author.id}).`
      );
    }

    this.sender = new User(internalMessage.author);
  }

  public get body(): string {
    return this.internalMessage.content;
  }

  public respond(response: MessageTemplate): Promise<SendMessageResult> {
    return this.sender.sendDirectMessage(response);
  }
}

export default ReceivedDirectMessage;
