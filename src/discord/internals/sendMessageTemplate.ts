import {
  DMChannel as DiscordJSDmChannel,
  EmbedField as DiscordJSEmbedField,
  Message as DiscordJSMessage,
  TextChannel as DiscordJSTextChannel,
} from 'discord.js';

import MessageTemplate from '@phil/discord/MessageTemplate';

import MessageBuilder from '@phil/message-builder';

type ValidDiscordJsChannel = DiscordJSDmChannel | DiscordJSTextChannel;

function sendMessage(
  channel: ValidDiscordJsChannel,
  message: string
): Promise<DiscordJSMessage> {
  return channel.send(message);
}

async function sendMessageBuilder(
  channel: ValidDiscordJsChannel,
  messageBuilder: MessageBuilder
): Promise<readonly DiscordJSMessage[]> {
  const messages: DiscordJSMessage[] = [];
  for (const message of messageBuilder.messages) {
    const sentMessage = await sendMessage(channel, message);
    messages.push(sentMessage);
  }

  return messages;
}

function sendErrorMessage(
  channel: ValidDiscordJsChannel,
  message: string
): Promise<DiscordJSMessage> {
  return sendMessage(channel, `:no_entry: **ERROR.** ${message}`);
}

function sendSuccessMessage(
  channel: ValidDiscordJsChannel,
  message: string
): Promise<DiscordJSMessage> {
  return sendMessage(channel, `:white_check_mark: **SUCCESS.** ${message}`);
}

export async function sendMessageTemplate(
  channel: ValidDiscordJsChannel,
  template: MessageTemplate
): Promise<DiscordJSMessage> {
  switch (template.type) {
    case 'plain': {
      if (template.text instanceof MessageBuilder) {
        const messageIds = await sendMessageBuilder(channel, template.text);
        return messageIds[messageIds.length - 1];
      }

      return sendMessage(channel, template.text);
    }
    case 'success': {
      return sendSuccessMessage(channel, template.text);
    }
    case 'error': {
      return sendErrorMessage(channel, template.error);
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

      let fields: DiscordJSEmbedField[] = [];
      if (template.fields) {
        fields = template.fields.map(
          (field): DiscordJSEmbedField => ({
            inline: field.inline === true,
            name: field.name,
            value: field.value || '',
          })
        );
      }

      return channel.send({
        embed: {
          color: colorHex,
          description: template.description || undefined,
          fields,
          footer: template.footer ? { text: template.footer } : undefined,
          title: template.title,
        },
      });
    }
    default: {
      // Will error only if the `switch` statement doesn't exhaustively cover
      // every value in the discriminated union. Leave this here!!
      return template;
    }
  }
}
