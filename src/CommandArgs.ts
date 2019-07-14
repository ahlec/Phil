import chronoNode = require('chrono-node');
import {
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  Role as DiscordIORole,
  Server as DiscordIOServer,
} from 'discord.io';
import { Moment } from 'moment';
import momentModuleFunc = require('moment');
import FuzzyFinder from './FuzzyFinder';

function memberNameSelector(
  member: DiscordIOMember,
  client: DiscordIOClient
): string {
  if (member.nick) {
    return member.nick;
  }

  const user = client.users[member.id];
  return user.username;
}

function roleNameSelector(role: DiscordIORole): string {
  return role.name;
}

const USER_MENTION_REGEX = /^<@(\d+)>$/;

export default class CommandArgs {
  private readonly queue: string[];

  public constructor(argPieces: ReadonlyArray<string>) {
    this.queue = [...argPieces];
  }

  public get isEmpty(): boolean {
    return !this.queue.length;
  }

  public get remainingArgs(): string[] {
    return [...this.queue];
  }

  public readString(name: string): string;
  public readString(name: string, optional: true): string | undefined;
  public readString(name: string, optional?: true): string | undefined {
    const str = this.queue.shift();
    if (!str && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    return str;
  }

  public readText(name: string): string;
  public readText(name: string, optional: true): string | undefined;
  public readText(name: string, optional?: true): string | undefined {
    if (!this.queue.length && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    return this.queue.splice(0, this.queue.length).join(' ');
  }

  public readNumber(name: string): number;
  public readNumber(name: string, optional: true): number | undefined;
  public readNumber(name: string, optional?: true): number | undefined {
    const str = this.queue.shift();
    if (!str && !optional) {
      throw new Error(`'${name}' was not provided`);
    }

    if (!str) {
      return undefined;
    }

    const num = parseInt(str, 10);
    if (isNaN(num)) {
      throw new Error(
        `'${name}' is supposed to be a number, but '${str}' doesn't appear to be a number.`
      );
    }

    return num;
  }

  public readEnum(name: string, values: ReadonlySet<string>): string;
  public readEnum(
    name: string,
    values: ReadonlySet<string>,
    optional: true
  ): string | undefined;
  public readEnum(
    name: string,
    values: ReadonlySet<string>,
    optional?: true
  ): string | undefined {
    const str = this.queue.shift();
    if (!str && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    if (!str) {
      return undefined;
    }

    if (!values.has(str)) {
      const valuesList = Array.from(values).join(', ');
      throw new Error(
        `'${name}' is supposed to be one the following: ${valuesList}. You provided '${str}'.`
      );
    }

    return str;
  }

  public readDate(name: string): Moment;
  public readDate(name: string, optional: true): Moment | undefined;
  public readDate(name: string, optional?: true): Moment | undefined {
    const pieces = this.queue.splice(0, 2);
    if (pieces.length !== 2 && !optional) {
      throw new Error(
        `'${name}' was not provided. It must come in the form of '17 March' or 'March 17'.`
      );
    }

    if (pieces.length !== 2) {
      return undefined;
    }

    const inputStr = pieces.join(' ');
    const date = chronoNode.parseDate(inputStr);
    if (!date || date === null) {
      throw new Error(
        `'${name}' is supposed to be a date, but I couldn't understand '${inputStr}'. It must come in the form of '17 March' or 'March 17'.`
      );
    }

    return momentModuleFunc(date);
  }

  public readMember(
    name: string,
    client: DiscordIOClient,
    server: DiscordIOServer
  ): DiscordIOMember;
  public readMember(
    name: string,
    client: DiscordIOClient,
    server: DiscordIOServer,
    optional: true
  ): DiscordIOMember | undefined;
  public readMember(
    name: string,
    client: DiscordIOClient,
    server: DiscordIOServer,
    optional?: true
  ): DiscordIOMember | undefined {
    const firstPiece = this.queue.shift();
    if (!firstPiece && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    if (!firstPiece) {
      return undefined;
    }

    let member: DiscordIOMember | undefined = server.members[firstPiece];
    if (member) {
      return member;
    }

    const mentionResults = firstPiece.match(USER_MENTION_REGEX);
    if (mentionResults && mentionResults.length >= 2) {
      member = server.members[mentionResults[1]];
      if (member) {
        return member;
      }
    }

    let searchString = firstPiece;
    let numToPop = 0;
    const finder = new FuzzyFinder(server.members, memberNameSelector, client);
    while (numToPop <= this.queue.length) {
      member = finder.search(searchString);
      if (member) {
        this.queue.splice(0, numToPop);
        return member;
      }

      searchString = `${searchString} ${this.queue[numToPop]}`;
      ++numToPop;
    }

    if (!optional) {
      throw new Error(`Could not find a user from '${searchString}'.`);
    }

    return undefined;
  }

  public readRole(name: string, server: DiscordIOServer): DiscordIORole;
  public readRole(
    name: string,
    server: DiscordIOServer,
    optional: true
  ): DiscordIORole | undefined;
  public readRole(
    name: string,
    server: DiscordIOServer,
    optional?: true
  ): DiscordIORole | undefined {
    const firstPiece = this.queue.shift();
    if (!firstPiece && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    if (!firstPiece) {
      return undefined;
    }

    let role: DiscordIORole | undefined = server.roles[firstPiece];
    if (role) {
      return role;
    }

    let searchString = firstPiece;
    let numToPop = 0;
    const finder = new FuzzyFinder(server.roles, roleNameSelector);
    while (numToPop <= this.queue.length) {
      role = finder.search(searchString);
      if (role) {
        this.queue.splice(0, numToPop);
        return role;
      }

      searchString = `${searchString} ${this.queue[numToPop]}`;
      ++numToPop;
    }

    if (!optional) {
      throw new Error(`Could not find a role from '${searchString}'.`);
    }

    return undefined;
  }
}
