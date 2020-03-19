import DiscordClient from '@phil/discord/Client';
import Server from '@phil/discord/Server';

export default class LeaderboardEntry {
  public readonly displayName: string;
  public readonly isStillInServer: boolean;

  constructor(
    discordClient: DiscordClient,
    server: Server,
    public readonly userId: string,
    public readonly score: number
  ) {
    const user = bot.users[this.userId];
    const currentUserDisplayName = getUserDisplayName(user, server);

    this.displayName = currentUserDisplayName || userId;
    this.isStillInServer = server.members[this.userId] != null;
  }
}
