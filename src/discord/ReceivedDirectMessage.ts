import { Client as DiscordIOClient } from 'discord.io';

import ReceivedMessage from './ReceivedMessage';
import User from './User';

class ReceivedDirectMessage extends ReceivedMessage {
  public constructor(
    internalClient: DiscordIOClient,
    id: string,
    body: string,
    public readonly sender: User
  ) {
    super(internalClient, id, sender.id, body);
  }
}

export default ReceivedDirectMessage;
