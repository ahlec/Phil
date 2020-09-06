import { Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';

import { Mention } from '@phil/messages/base';
import PublicMessage from '@phil/messages/public';
import ServerConfig from './server-config';

class CommandInvocation {
  public static parseFromMessage(
    serverConfig: ServerConfig,
    message: PublicMessage
  ): CommandInvocation | null {
    if (!message.content) {
      return null;
    }

    const words = message.content
      .split(' ')
      .filter((word) => word.trim().length > 0);
    if (!words.length) {
      return null;
    }

    const prompt = words[0].toLowerCase();
    if (!prompt.startsWith(serverConfig.commandPrefix)) {
      return null;
    }

    const commandName = prompt.substr(serverConfig.commandPrefix.length);
    return new CommandInvocation(
      commandName,
      words.slice(1),
      message,
      serverConfig
    );
  }

  private constructor(
    public readonly commandName: string,
    public readonly commandArgs: ReadonlyArray<string>,
    private readonly message: PublicMessage,
    public readonly serverConfig: ServerConfig
  ) {}

  /**
   * Message ID
   */
  public get id(): string {
    return this.message.id;
  }

  public get channelId(): string {
    return this.message.channelId;
  }

  public get mentions(): readonly Mention[] {
    return this.message.mentions;
  }

  public get server(): DiscordIOServer {
    return this.message.server;
  }

  public get user(): DiscordIOUser {
    return this.message.user;
  }

  public get userId(): string {
    return this.message.userId;
  }
}

export default CommandInvocation;
