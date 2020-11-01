import { Client as DiscordIOClient } from 'discord.io';

import BaseChannel from '@phil/discord/BaseChannel';

class UsersDirectMessagesChannel extends BaseChannel {
  public constructor(internalClient: DiscordIOClient, id: string) {
    super(internalClient, id);
  }
}

export default UsersDirectMessagesChannel;
