import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
  User as DiscordIOUser,
} from 'discord.io';

import MessageTemplate from '@phil/discord/MessageTemplate';

import { Mention } from '@phil/messages/base';
import PublicMessage from '@phil/messages/public';
import ServerConfig from './server-config';
import { sendSuccessMessage, sendErrorMessage } from './utils';
import {
  sendEmbedMessage,
  sendMessageBuilder,
  sendMessage,
} from './promises/discord';
import EmbedColor from './embed-color';
import MessageBuilder from './message-builder';

class CommandInvocation {
  public static parseFromMessage(
    client: DiscordIOClient,
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
      client,
      commandName,
      words.slice(1),
      message,
      serverConfig
    );
  }

  private constructor(
    private readonly discordClient: DiscordIOClient,
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

  public async respond(response: MessageTemplate): Promise<void> {
    switch (response.type) {
      case 'plain': {
        if (response.text instanceof MessageBuilder) {
          await sendMessageBuilder(
            this.discordClient,
            this.message.channelId,
            response.text
          );
          return;
        }

        await sendMessage(
          this.discordClient,
          this.message.channelId,
          response.text
        );
        return;
      }
      case 'success': {
        await sendSuccessMessage({
          bot: this.discordClient,
          channelId: this.message.channelId,
          message: response.text,
        });
        return;
      }
      case 'error': {
        await sendErrorMessage({
          bot: this.discordClient,
          channelId: this.message.channelId,
          message: response.error,
        });
        return;
      }
      case 'embed': {
        let color: EmbedColor;
        switch (response.color) {
          case 'powder-blue': {
            color = EmbedColor.Info;
            break;
          }
          case 'purple': {
            color = EmbedColor.Timezone;
            break;
          }
          case 'green': {
            color = EmbedColor.Success;
            break;
          }
          case 'red': {
            color = EmbedColor.Error;
            break;
          }
        }

        await sendEmbedMessage(this.discordClient, this.message.channelId, {
          color,
          description:
            typeof response.description === 'string'
              ? response.description
              : undefined,
          fields: response.fields || undefined,
          footer:
            typeof response.footer === 'string'
              ? {
                  text: response.footer,
                }
              : undefined,
          title: response.title,
        });
        return;
      }
      default: {
        // Will error only if the `switch` statement doesn't exhaustively cover
        // every value in the discriminated union. Leave this here!!
        return response;
      }
    }
  }
}

export default CommandInvocation;
