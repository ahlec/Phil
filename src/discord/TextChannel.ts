import {
  Channel as DiscordIOChannel,
  Client as DiscordIOClient,
} from 'discord.io';

import BaseChannel from '@phil/discord/BaseChannel';
import Server from './Server';

class TextChannel extends BaseChannel {
  public constructor(
    internalClient: DiscordIOClient,
    id: string,
    private readonly internalChannel: DiscordIOChannel,
    public readonly server: Server
  ) {
    super(internalClient, id);
  }

  public get name(): string {
    return this.internalChannel.name;
  }
}

export default TextChannel;
