import * as DiscordIO from 'discord.io';

import MessageBuilder from '@phil/message-builder';

import PublicMessage from './PublicMessage';
import { Snowflake } from './types';

export enum EmbedColor {
  /**
   * #b0e0e6
   */
  PowderBlue,

  /**
   * #61b329
   */
  Green,

  /**
   * #cd5555
   */
  Red,

  /**
   * #7a378b
   */
  Purple,
}

const EMBED_HEX_COLORS: { [color in EmbedColor]: number } = {
  [EmbedColor.PowderBlue]: 0xb0e0e6,
  [EmbedColor.Green]: 0x61b329,
  [EmbedColor.Red]: 0xcd5555,
  [EmbedColor.Purple]: 0x7a378b,
};

export interface EmbedField {
  name: string;
  value: string;
}

export interface EmbedMessageDefinition {
  color: EmbedColor;
  title: string;
  footer: string | null;
  contents: string | ReadonlyArray<EmbedField>;
}

function convertToDiscordIOEmbedField(
  field: EmbedField
): { name: string; value?: string; inline?: boolean } {
  return field;
}

export default class Channel {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    public readonly serverId: Snowflake,
    public readonly channelId: Snowflake
  ) {}

  public sendMessage(message: string): Promise<PublicMessage>;
  public sendMessage(
    definition: EmbedMessageDefinition
  ): Promise<PublicMessage>;
  public sendMessage(
    message: MessageBuilder
  ): Promise<ReadonlyArray<PublicMessage>>;
  public async sendMessage(
    message: string | EmbedMessageDefinition | MessageBuilder
  ): Promise<PublicMessage | ReadonlyArray<PublicMessage>> {
    if (typeof message === 'string') {
      return this.sendMessageInternal(message);
    }

    if (message instanceof MessageBuilder) {
      const sentMessages: PublicMessage[] = [];
      for (const str of message.messages) {
        sentMessages.push(await this.sendMessageInternal(str));
      }

      return sentMessages;
    }

    return this.sendEmbedMessageInternal(message);
  }

  private sendMessageInternal(str: string): Promise<PublicMessage> {
    return new Promise((resolve, reject) => {
      this.discordIOClient.sendMessage(
        {
          message: str,
          to: this.channelId,
        },
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }

          const messageId: Snowflake = response.id;
          resolve(
            new PublicMessage(
              this.discordIOClient,
              this.serverId,
              this.channelId,
              messageId
            )
          );
        }
      );
    });
  }

  private sendEmbedMessageInternal(
    definition: EmbedMessageDefinition
  ): Promise<PublicMessage> {
    return new Promise((resolve, reject) =>
      this.discordIOClient.sendMessage(
        {
          embed: {
            color: EMBED_HEX_COLORS[definition.color],
            description:
              typeof definition.contents === 'string'
                ? definition.contents
                : undefined,
            fields:
              typeof definition.contents !== 'string'
                ? definition.contents.map(convertToDiscordIOEmbedField)
                : undefined,
            footer: definition.footer
              ? {
                  text: definition.footer,
                }
              : undefined,
            title: definition.title,
          },
          to: this.channelId,
        },
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }

          const messageId: Snowflake = response.id;
          resolve(
            new PublicMessage(
              this.discordIOClient,
              this.serverId,
              this.channelId,
              messageId
            )
          );
        }
      )
    );
  }
}
