import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';
import { BotUtils } from '../utils';

export default class LeaderboardEntry {
  public readonly userId: string;
  public readonly displayName: string;
  public readonly isStillInServer: boolean;
  public readonly score: number;

  constructor(bot: DiscordIOClient, server: DiscordIOServer, dbRow: any) {
    this.userId = dbRow.suggesting_userid;

    const user = bot.users[this.userId];
    const currentUserDisplayName = BotUtils.getUserDisplayName(user, server);

    this.displayName = currentUserDisplayName || dbRow.suggesting_user;
    this.isStillInServer = server.members[this.userId] != null;
    this.score = parseInt(dbRow.score, 10);
  }
}
