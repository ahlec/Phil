import { Client as DiscordIOClient } from 'discord.io';

import Member from '@phil/discord/Member';
import MessageTemplate from '@phil/discord/MessageTemplate';
import OutboundMessage from '@phil/discord/OutboundMessage';
import Server from '@phil/discord/Server';
import TextChannel from '@phil/discord/TextChannel';
import User from '@phil/discord/User';
import UsersDirectMessagesChannel from '@phil/discord/UsersDirectMessagesChannel';

import { sendSuccessMessage, sendErrorMessage } from '@phil/utils';
import {
  sendEmbedMessage,
  sendMessageBuilder,
  sendMessage,
} from '@phil/promises/discord';
import EmbedColor from '@phil/embed-color';
import MessageBuilder from '@phil/message-builder';

export interface SendMessageResult {
  /**
   * The Discord message for the final message sent.
   * Some messages will actually require multiple Discord messages
   * to be completely sent due to maximum message length; this is the
   * the final message, which can be useful for adding reactions
   * and other things to the visual "end" of the post.
   */
  finalMessage: OutboundMessage;
}

export function getChannel(
  discordClient: DiscordIOClient,
  channelId: string
): TextChannel | UsersDirectMessagesChannel {
  const rawChannel = discordClient.channels[channelId];
  if (!rawChannel) {
    return new UsersDirectMessagesChannel(channelId);
  }

  const rawServer = discordClient.servers[rawChannel.guild_id];
  if (!rawServer) {
    throw new Error(
      `Could not find server '${rawChannel.guild_id}' supposedly containing '${channelId}'.`
    );
  }

  const server = new Server(discordClient, rawServer, rawChannel.guild_id);
  return new TextChannel(server, channelId);
}

export function getServerMember(
  discordClient: DiscordIOClient,
  serverId: string,
  userId: string
): Member | null {
  const internalMember = discordClient.servers[serverId]?.members[userId];
  const internalUser = discordClient.users[userId];
  if (!internalUser || !internalMember) {
    return null;
  }

  return new Member(
    discordClient,
    internalMember,
    serverId,
    new User(internalUser, userId)
  );
}

/**
 * Utility function that should only be called in circumstances where
 * we know that the message was sent by the bot.
 */
export function getKnownOutboundMessage(
  discordClient: DiscordIOClient,
  messageId: string,
  channelId: string
): OutboundMessage {
  return new OutboundMessage(
    discordClient,
    getChannel(discordClient, channelId),
    messageId
  );
}

export async function sendMessageTemplate(
  discordClient: DiscordIOClient,
  channelId: string,
  template: MessageTemplate
): Promise<SendMessageResult> {
  const finalMessageId = await sendMessageTemplateInternal(
    discordClient,
    channelId,
    template
  );

  return {
    finalMessage: getKnownOutboundMessage(
      discordClient,
      finalMessageId,
      channelId
    ),
  };
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
      return sendSuccessMessage({
        bot: discordClient,
        channelId: channelId,
        message: template.text,
      });
    }
    case 'error': {
      return sendErrorMessage({
        bot: discordClient,
        channelId: channelId,
        message: template.error,
      });
    }
    case 'embed': {
      let color: EmbedColor;
      switch (template.color) {
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

      return sendEmbedMessage(discordClient, channelId, {
        color,
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
