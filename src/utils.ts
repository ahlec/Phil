import {
  Client as DiscordIOClient,
  Role as DiscordIORole,
  Server as DiscordIOServer,
  User as DiscordIOUser,
} from 'discord.io';
import { sendMessage, getMemberRolesInServer } from './promises/discord';

import Role from '@phil/discord/Role';

interface SendErrorMessageOpts {
  readonly bot: DiscordIOClient;
  readonly channelId: string;
  readonly message: string;
}

interface SendSuccessMessageOpts {
  readonly bot: DiscordIOClient;
  readonly channelId: string;
  readonly message: string;
}

export function sendErrorMessage(
  options: SendErrorMessageOpts
): Promise<string> {
  const message = ':no_entry: **ERROR.** ' + options.message;
  return sendMessage(options.bot, options.channelId, message);
}

export function sendSuccessMessage(
  options: SendSuccessMessageOpts
): Promise<string> {
  const message = ':white_check_mark: **SUCCESS.** ' + options.message;
  return sendMessage(options.bot, options.channelId, message);
}

export async function doesMemberUseRole(
  client: DiscordIOClient,
  serverId: string,
  memberId: string,
  roleId: string
): Promise<boolean> {
  const memberRoles = await getMemberRolesInServer(client, serverId, memberId);
  for (const memberRoleId of memberRoles) {
    if (memberRoleId === roleId) {
      return true;
    }
  }

  return false;
}

export function getRandomArrayEntry<T>(arr: ReadonlyArray<T>): T {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

export function isValidHexColor(input: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(input);
}

export function isHexColorRole(role: Role | DiscordIORole): boolean {
  const isHex = isValidHexColor(role.name);
  return isHex;
}

export function isNumeric(input: string): boolean {
  const numInput = parseInt(input, 10);
  if (isNaN(numInput) || !isFinite(numInput)) {
    return false;
  }

  return numInput.toString(10) === input;
}

export function isSameDay(dateA: Date, dateB: Date): boolean {
  if (dateA.getUTCFullYear() !== dateB.getUTCFullYear()) {
    return false;
  }

  if (dateA.getUTCMonth() !== dateB.getUTCMonth()) {
    return false;
  }

  return dateA.getUTCDate() === dateB.getUTCDate();
}

export function stitchTogetherArray(values: ReadonlyArray<string>): string {
  let str = '';
  for (let index = 0; index < values.length; ++index) {
    if (index > 0) {
      if (index < values.length - 1) {
        str += ', ';
      } else {
        str += ' or ';
      }
    }

    str += '`' + values[index] + '`';
  }

  return str;
}

export function getUserDisplayName(
  user: DiscordIOUser,
  server: DiscordIOServer
): string | null {
  if (!user) {
    return null;
  }

  const member = server.members[user.id];
  if (member && member.nick && member.nick.length > 0) {
    return member.nick;
  }

  return user.username;
}

export function truncateString(message: string, maxCharacters: number): string {
  if (!message) {
    return '';
  }

  if (maxCharacters <= 0) {
    return '';
  }

  if (maxCharacters >= message.length) {
    return message;
  }

  const finalSpace = message.lastIndexOf(' ', maxCharacters);
  const finalTab = message.lastIndexOf('\t', maxCharacters);
  const finalNewline = message.lastIndexOf('\n', maxCharacters);

  let finalIndex = Math.max(finalSpace, finalTab, finalNewline);
  if (finalIndex < 0) {
    finalIndex = maxCharacters;
  }

  return message.substr(0, finalIndex);
}
