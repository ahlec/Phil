import {
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  User as DiscordIOUser,
} from 'discord.io';
import Database from './database';
import Features from './features/all-features';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import { DiscordPromises } from './promises/discord';
import ServerConfig from './server-config';
import { BotUtils } from './utils';

export default class Greeting extends Logger {
  private readonly user: DiscordIOUser;

  public constructor(
    private readonly client: DiscordIOClient,
    private readonly db: Database,
    private readonly serverConfig: ServerConfig,
    private readonly member: DiscordIOMember
  ) {
    super(new LoggerDefinition('Greeting'));

    this.user = client.users[member.id];
    if (!this.user) {
      this.error(`Unable to retrieve user for member ${member.id}.`);
    }
  }

  public async send(channelId: string) {
    try {
      const shouldWelcome = await this.shouldWelcomeMember();
      if (!shouldWelcome) {
        return;
      }

      const welcomeMessage = this.makeGreetingMessage();
      if (!welcomeMessage) {
        return;
      }

      DiscordPromises.sendMessage(this.client, channelId, welcomeMessage);
    } catch (err) {
      const summaryMessage = `There was an error sending greeting message for member ${
        this.member.id
      } in server ${this.serverConfig.server.id}.`;
      this.error(summaryMessage);
      this.error(err);
      await DiscordPromises.sendMessage(
        this.client,
        this.serverConfig.botControlChannel.id,
        summaryMessage
      );
    }
  }

  private makeGreetingMessage(): string | null {
    if (!this.serverConfig.welcomeMessage) {
      return null;
    }

    const displayName = BotUtils.getUserDisplayName(
      this.user,
      this.serverConfig.server
    );
    return this.serverConfig.welcomeMessage
      .replace(/\{user\}/g, '<@' + this.user.id + '>')
      .replace(/\{name\}/g, displayName || 'new member');
  }

  private async shouldWelcomeMember(): Promise<boolean> {
    if (this.user.bot) {
      return false;
    }

    return await Features.WelcomeMessage.getIsEnabled(
      this.db,
      this.serverConfig.server.id
    );
  }
}
