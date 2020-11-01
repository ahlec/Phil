import { Client as DiscordIOClient } from 'discord.io';

import Message from './Message';
import MessageTemplate from './MessageTemplate';
import User from './User';
import { SendMessageResult } from './types';

import { sendMessageTemplate } from './internals/sendMessageTemplate';
import UsersDirectMessagesChannel from './UsersDirectMessagesChannel';

class ReceivedDirectMessage extends Message {
  public constructor(
    internalClient: DiscordIOClient,
    id: string,
    public readonly body: string,
    public readonly sender: User
  ) {
    super(internalClient, id, sender.id);
  }

  public respond(response: MessageTemplate): Promise<SendMessageResult> {
    return sendMessageTemplate(
      this.internalClient,
      new UsersDirectMessagesChannel(this.internalClient, this.sender.id),
      response
    );
  }
}

export default ReceivedDirectMessage;
