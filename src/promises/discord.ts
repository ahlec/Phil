import * as Discord from 'discord.io';
import EmbedColor, { getColorValue } from '@phil/embed-color';
import MessageBuilder from '@phil/message-builder';

export interface EmbedField {
  name: string;
  value?: string;
  inline?: boolean;
}

export interface EmbedData {
  author?: {
    icon_url?: string;
    name: string;
    url?: string;
  };
  color: EmbedColor;
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

export interface EditRoleOptions {
  name: string;
  color?: number;
}

export function sendMessage(
  bot: Discord.Client,
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

export async function sendMessageBuilder(
  bot: Discord.Client,
  channelId: string,
  messageBuilder: MessageBuilder
): Promise<string[]> {
  const messageIds = [];
  for (const message of messageBuilder.messages) {
    const messageId = await this.sendMessage(bot, channelId, message);
    messageIds.push(messageId);
  }

  return messageIds;
}

export function sendEmbedMessage(
  bot: Discord.Client,
  channelId: string,
  embedData: EmbedData
): Promise<string> {
  return new Promise((resolve, reject) => {
    bot.sendMessage(
      {
        embed: {
          author: embedData.author,
          color: getColorValue(embedData.color),
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

export function editMessage(
  bot: Discord.Client,
  channelId: string,
  messageId: string,
  text: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    bot.editMessage(
      {
        channelID: channelId,
        message: text,
        messageID: messageId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response); // TODO: What does this return?
      }
    );
  });
}

export function deleteMessage(
  bot: Discord.Client,
  channelId: string,
  messageId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    bot.deleteMessage(
      {
        channelID: channelId,
        messageID: messageId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response); // TODO: What does this return?
      }
    );
  });
}

export function deleteRole(
  bot: Discord.Client,
  serverId: string,
  roleId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    bot.deleteRole(
      {
        roleID: roleId,
        serverID: serverId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response); // TODO: What does this return?
      }
    );
  });
}

export function pinMessage(
  bot: Discord.Client,
  channelId: string,
  messageId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    bot.pinMessage(
      {
        channelID: channelId,
        messageID: messageId,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response); // TODO: What does this return?
      }
    );
  });
}

interface ApiServerMember {
  user: {
    id: string;
  };
  roles: ReadonlyArray<string>;
}

function fetchServerMemberFromApi(
  bot: Discord.Client,
  serverId: string,
  memberId: string
): Promise<ApiServerMember> {
  return new Promise<ApiServerMember>((resolve, reject) => {
    let numApiInvocations = 0;
    const callServer = (offsetUserId: string | undefined): void => {
      ++numApiInvocations;
      bot.getMembers(
        {
          /**
           * We'll be hopefully moving away from discord.io which has been a huge
           * fucking thorn for way too long, especially with TypeScript.
           */
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          after: offsetUserId,
          /**
           * We'll be hopefully moving away from discord.io which has been a huge
           * fucking thorn for way too long, especially with TypeScript.
           */
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          serverID: serverId,
        },
        (err: unknown, data: ReadonlyArray<ApiServerMember>) => {
          if (err) {
            reject(err);
            return;
          }

          if (!data.length) {
            reject(
              new Error(
                `Iterated entire member list for server '${serverId}' without finding member '${memberId}' (num calls: ${numApiInvocations})`
              )
            );
          }

          const targetMember = data.find(
            (member) => member.user.id === memberId
          );
          if (targetMember) {
            resolve(targetMember);
            return;
          }

          callServer(data[data.length - 1].user.id);
        }
      );
    };

    callServer(undefined);
  });
}

export async function getMemberRolesInServer(
  bot: Discord.Client,
  serverId: string,
  memberId: string
): Promise<ReadonlyArray<string>> {
  const server = bot.servers[serverId];
  if (!server) {
    throw new Error("Called getMemberRolesInServer for a server bot isn't in.");
  }

  const cachedMember = server.members[memberId];
  if (cachedMember) {
    return cachedMember.roles;
  }

  const apiMember = await fetchServerMemberFromApi(bot, serverId, memberId);
  return apiMember.roles;
}
