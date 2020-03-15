import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';
import { getUserDisplayName } from '@phil/utils';

export default class LeaderboardEntry {
  public readonly displayName: string;
  public readonly isStillInServer: boolean;

  constructor(
    bot: DiscordIOClient,
    server: DiscordIOServer,
    public readonly userId: string,
    public readonly score: number
  ) {
    const user = bot.users[this.userId];
    const currentUserDisplayName = getUserDisplayName(user, server);

    this.displayName = currentUserDisplayName || userId;
    this.isStillInServer = server.members[this.userId] != null;
  }
}
