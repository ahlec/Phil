import { Role as DiscordIORole } from 'discord.io';
import Features from '../features/all-features';
import { EditRoleOptions } from '@phil/promises/discord';
import { AllPronouns } from '../pronouns/definitions';
import { Pronoun } from '../pronouns/pronoun';
import { getPronounFromRole } from '../pronouns/utils';
import ServerConfig from '../server-config';
import { getRandomArrayEntry } from '@phil/utils';
import { LoggerDefinition } from './@types';
import MemberUniqueRoleCommandBase from './bases/member-unique-role-base';

const pronounUsageToPronouns: { [pronoun: string]: Pronoun } = {};
for (const pronoun of AllPronouns) {
  pronounUsageToPronouns[pronoun.subject.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.object.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.possessive.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.possessivePronoun.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.reflexive.toLowerCase()] = pronoun;
}

export default class PronounCommand extends MemberUniqueRoleCommandBase<
  Pronoun
> {
  public constructor(parentDefinition: LoggerDefinition) {
    super('pronoun', parentDefinition, {
      aliases: ['pronouns'],
      feature: Features.Pronouns,
      helpDescription: 'Changes the pronouns that Phil uses to refer to you.',
      versionAdded: 13,
    });
  }

  protected getMissingCommandArgsErrorMessage(
    serverConfig: ServerConfig
  ): string {
    return (
      'I will need you to specify which pronouns you would like me ' +
      'to use for you by using it as a command argument.\n\n' +
      this.getUsageMessage(serverConfig)
    );
  }

  protected getInvalidInputErrorMessage(
    input: string,
    serverConfig: ServerConfig
  ): string {
    return (
      "I didn't understand `" +
      input +
      '` as a pronoun that I know ' +
      'how to use.\n\n' +
      this.getUsageMessage(serverConfig)
    );
  }

  protected tryParseInput(input: string): Pronoun | null {
    const pronoun = pronounUsageToPronouns[input.toLowerCase()];
    if (!pronoun) {
      return null;
    }

    return pronoun;
  }

  protected isRolePartOfUniquePool(role: DiscordIORole): boolean {
    const pronoun = getPronounFromRole(role);
    return pronoun !== null;
  }

  protected doesRoleMatchData(role: DiscordIORole, data: Pronoun): boolean {
    const rolePronoun = getPronounFromRole(role);
    return data === rolePronoun;
  }

  protected getRoleConfig(data: Pronoun): EditRoleOptions {
    return {
      name: data.roleName,
    };
  }

  protected getSuccessMessage(
    serverConfig: ServerConfig,
    data: Pronoun
  ): string {
    return (
      "I've changed your pronouns to **" +
      data.subject +
      '/' +
      data.object +
      '/' +
      data.possessive +
      '**. If that was undesired, ' +
      'or if your pronouns change in the future, you can easily change ' +
      'them again by using `' +
      serverConfig.commandPrefix +
      'pronoun`.'
    );
  }

  private getUsageMessage(serverConfig: ServerConfig): string {
    let message =
      'The pronouns that I know how to use right now are as follows:\n\n';

    for (const pronoun of AllPronouns) {
      message += this.getPronounUsage(pronoun);
      message += '\n';
    }

    const randomPronoun = getRandomArrayEntry(AllPronouns);
    message +=
      '\nFor instance, if you would like **' +
      randomPronoun.displayName +
      '**, you can request those be the pronouns I use for you by saying `' +
      serverConfig.commandPrefix +
      'pronoun ' +
      randomPronoun.subject +
      '`.';
    return message;
  }

  private getPronounUsage(pronoun: Pronoun): string {
    let usage = '**' + pronoun.displayName + '**, use: ';
    const uniqueChoices: Set<string> = new Set();
    usage = this.appendUsage(usage, pronoun.subject, uniqueChoices);
    usage = this.appendUsage(usage, pronoun.object, uniqueChoices);
    usage = this.appendUsage(usage, pronoun.possessive, uniqueChoices);
    usage = this.appendUsage(usage, pronoun.possessivePronoun, uniqueChoices);
    usage = this.appendUsage(usage, pronoun.reflexive, uniqueChoices);
    return usage;
  }

  private appendUsage(
    message: string,
    pronoun: string,
    usedText: Set<string>
  ): string {
    if (usedText.has(pronoun)) {
      return message;
    }

    usedText.add(pronoun);

    if (usedText.size > 0) {
      message += ', ';
    }

    message += '`' + pronoun + '`';
    return message;
  }
}
