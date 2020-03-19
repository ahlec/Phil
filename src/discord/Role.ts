import * as DiscordIO from 'discord.io';
import { Snowflake } from './types';

export default class Role {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    private readonly serverId: Snowflake,
    public readonly roleId: Snowflake
  ) {}
}
