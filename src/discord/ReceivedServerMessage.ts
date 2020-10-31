import { Client as DiscordIOClient } from 'discord.io';

import Member from './Member';
import ReceivedMessage from './ReceivedMessage';
import TextChannel from './TextChannel';

class ReceivedServerMessage extends ReceivedMessage {
  public constructor(
    internalClient: DiscordIOClient,
    id: string,
    body: string,
    public readonly sender: Member,
    public readonly channel: TextChannel
  ) {
    super(internalClient, id, body, channel.id);
  }
}

export default ReceivedServerMessage;
