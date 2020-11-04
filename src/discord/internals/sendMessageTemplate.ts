import { Client as DiscordIOClient } from 'discord.io';

import MessageTemplate, { EmbedField } from '@phil/discord/MessageTemplate';
import OutboundMessage from '@phil/discord/OutboundMessage';
import TextChannel from '@phil/discord/TextChannel';
import UsersDirectMessagesChannel from '@phil/discord/UsersDirectMessagesChannel';
import { SendMessageResult } from '@phil/discord/types';

import MessageBuilder from '@phil/message-builder';

export async function sendMessageTemplate(
  discordClient: DiscordIOClient,
  channel: TextChannel | UsersDirectMessagesChannel,
  template: MessageTemplate
): Promise<SendMessageResult> {
  const finalMessageId = await sendMessageTemplateInternal(
    discordClient,
    channel.id,
    template
  );

  return {
    finalMessage: new OutboundMessage(discordClient, channel, finalMessageId),
  };
}

function sendMessage(
  bot: DiscordIOClient,
  channelId: string,
  message: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    bot.sendMessage(
      {
        message,
        to: channelId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response.id);
      }
    );
  });
}

async function sendMessageBuilder(
  bot: DiscordIOClient,
  channelId: string,
  messageBuilder: MessageBuilder
): Promise<string[]> {
  const messageIds = [];
  for (const message of messageBuilder.messages) {
    const messageId = await sendMessage(bot, channelId, message);
    messageIds.push(messageId);
  }

  return messageIds;
}

interface EmbedData {
  author?: {
    icon_url?: string;
    name: string;
    url?: string;
  };
  color: number;
  description?: string;
  fields?: readonly EmbedField[];
  thumbnail?: {
    url: string;
  };
  title: string;
  timestamp?: Date;
  url?: string;
  footer?: {
    icon_url?: string;
    text: string;
  };
}

function sendEmbedMessage(
  bot: DiscordIOClient,
  channelId: string,
  embedData: EmbedData
): Promise<string> {
  return new Promise((resolve, reject) => {
    bot.sendMessage(
      {
        embed: {
          author: embedData.author,
          color: embedData.color,
          description: embedData.description,
          fields: embedData.fields as [EmbedField],
          footer: embedData.footer,
          thumbnail: embedData.thumbnail,
          timestamp: embedData.timestamp,
          title: embedData.title,
          url: embedData.url,
        },
        to: channelId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response.id);
      }
    );
  });
}

function sendErrorMessage(
  bot: DiscordIOClient,
  channelId: string,
  message: string
): Promise<string> {
  return sendMessage(bot, channelId, `:no_entry: **ERROR.** ${message}`);
}

function sendSuccessMessage(
  bot: DiscordIOClient,
  channelId: string,
  message: string
): Promise<string> {
  return sendMessage(
    bot,
    channelId,
    `:white_check_mark: **SUCCESS.** ${message}`
  );
}

async function sendMessageTemplateInternal(
  discordClient: DiscordIOClient,
  channelId: string,
  template: MessageTemplate
): Promise<string> {
  switch (template.type) {
    case 'plain': {
      if (template.text instanceof MessageBuilder) {
        const messageIds = await sendMessageBuilder(
          discordClient,
          channelId,
          template.text
        );
        return messageIds[messageIds.length - 1];
      }

      return sendMessage(discordClient, channelId, template.text);
    }
    case 'success': {
      return sendSuccessMessage(discordClient, channelId, template.text);
    }
    case 'error': {
      return sendErrorMessage(discordClient, channelId, template.error);
    }
    case 'embed': {
      let colorHex: number;
      switch (template.color) {
        case 'powder-blue': {
          colorHex = 0xb0e0e6;
          break;
        }
        case 'purple': {
          colorHex = 0x7a378b;
          break;
        }
        case 'green': {
          colorHex = 0x61b329;
          break;
        }
        case 'red': {
          colorHex = 0xcd5555;
          break;
        }
        case 'yellow': {
          colorHex = 0xfcdc3b;
          break;
        }
      }

      return sendEmbedMessage(discordClient, channelId, {
        color: colorHex,
        description:
          typeof template.description === 'string'
            ? template.description
            : undefined,
        fields: template.fields || undefined,
        footer:
          typeof template.footer === 'string'
            ? {
                text: template.footer,
              }
            : undefined,
        title: template.title,
      });
    }
    default: {
      // Will error only if the `switch` statement doesn't exhaustively cover
      // every value in the discriminated union. Leave this here!!
      return template;
    }
  }
}
