import * as chronoNode from 'chrono-node';
import * as moment from 'moment';

import Member from '@phil/discord/Member';
import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';

import FuzzyFinder from './FuzzyFinder';

function memberNameSelector(member: Member): string {
  return member.displayName;
}

function roleNameSelector(role: Role): string {
  return role.name;
}

const USER_MENTION_REGEX = /^<@(\d+)>$/;

export default class CommandArgs {
  private readonly queue: string[];

  public constructor(
    private readonly server: Server,
    argPieces: ReadonlyArray<string>
  ) {
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

  public readDate(name: string): moment.Moment;
  public readDate(name: string, optional: true): moment.Moment | undefined;
  public readDate(name: string, optional?: true): moment.Moment | undefined {
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

    return moment(date);
  }

  public readMember(
    name: string,
    options?: { isOptional?: false }
  ): Promise<Member>;
  public readMember(
    name: string,
    options: { isOptional: true }
  ): Promise<Member | null>;
  public async readMember(
    name: string,
    { isOptional = false }: { isOptional?: boolean } = {}
  ): Promise<Member | null> {
    const firstPiece = this.queue.shift();
    if (!firstPiece && !isOptional) {
      throw new Error(`'${name}' was not provided.`);
    }

    if (!firstPiece) {
      return null;
    }

    let member = await this.server.getMember(firstPiece);
    if (member) {
      return member;
    }

    const mentionResults = firstPiece.match(USER_MENTION_REGEX);
    if (mentionResults && mentionResults.length >= 2) {
      member = await this.server.getMember(mentionResults[1]);
      if (member) {
        return member;
      }
    }

    let searchString = firstPiece;
    let numToPop = 0;
    const lookup: { [userId: string]: Member } = {};
    this.server.members.forEach((member): void => {
      lookup[member.user.id] = member;
    });

    const finder = new FuzzyFinder(lookup, memberNameSelector);
    while (numToPop <= this.queue.length) {
      member = finder.search(searchString);
      if (member) {
        this.queue.splice(0, numToPop);
        return member;
      }

      searchString = `${searchString} ${this.queue[numToPop]}`;
      ++numToPop;
    }

    if (!isOptional) {
      throw new Error(`Could not find a user from '${searchString}'.`);
    }

    return null;
  }

  public readRole(name: string): Role;
  public readRole(name: string, optional: true): Role | undefined;
  public readRole(name: string, optional?: true): Role | undefined {
    const firstPiece = this.queue.shift();
    if (!firstPiece && !optional) {
      throw new Error(`'${name}' was not provided.`);
    }

    if (!firstPiece) {
      return undefined;
    }

    let role: Role | null = this.server.getRole(firstPiece);
    if (role) {
      return role;
    }

    let searchString = firstPiece;
    let numToPop = 0;
    const lookup: { [roleId: string]: Role } = {};
    this.server.roles.forEach((role): void => {
      lookup[role.id] = role;
    });

    const finder = new FuzzyFinder(lookup, roleNameSelector);
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
