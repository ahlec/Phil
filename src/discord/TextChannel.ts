import { Channel as DiscordIOChannel } from 'discord.io';

import Server from './Server';

class TextChannel {
  public constructor(
    private readonly internalChannel: DiscordIOChannel,
    public readonly server: Server,
    public readonly id: string
  ) {}

  public get name(): string {
    return this.internalChannel.name;
  }
}

export default TextChannel;
