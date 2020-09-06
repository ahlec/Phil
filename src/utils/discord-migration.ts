import { Client as DiscordIOClient } from 'discord.io';

import MessageTemplate from '@phil/discord/MessageTemplate';

import { sendSuccessMessage, sendErrorMessage } from '@phil/utils';
import {
  sendEmbedMessage,
  sendMessageBuilder,
  sendMessage,
} from '@phil/promises/discord';
import EmbedColor from '@phil/embed-color';
import MessageBuilder from '@phil/message-builder';

export async function sendMessageTemplate(
  discordClient: DiscordIOClient,
  channelId: string,
  template: MessageTemplate
): Promise<void> {
  switch (template.type) {
    case 'plain': {
      if (template.text instanceof MessageBuilder) {
        await sendMessageBuilder(discordClient, channelId, template.text);
        return;
      }

      await sendMessage(discordClient, channelId, template.text);
      return;
    }
    case 'success': {
      await sendSuccessMessage({
        bot: discordClient,
        channelId: channelId,
        message: template.text,
      });
      return;
    }
    case 'error': {
      await sendErrorMessage({
        bot: discordClient,
        channelId: channelId,
        message: template.error,
      });
      return;
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

      await sendEmbedMessage(discordClient, channelId, {
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
      return;
    }
    default: {
      // Will error only if the `switch` statement doesn't exhaustively cover
      // every value in the discriminated union. Leave this here!!
      return template;
    }
  }
}
