import { Role as DiscordIORole } from 'discord.io';
import { IPronoun, IServerConfig } from 'phil';
import Features from '../phil/features/all-features';
import { AllPronouns, getPronounFromRole } from '../phil/pronouns';
import BotUtils from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import MemberUniqueRoleCommandBase from './bases/member-unique-role-base';

const pronounUsageToPronouns: { [pronoun: string]: IPronoun } = {};
for (const pronoun of AllPronouns) {
    pronounUsageToPronouns[pronoun.subject.toLowerCase()] = pronoun;
    pronounUsageToPronouns[pronoun.object.toLowerCase()] = pronoun;
    pronounUsageToPronouns[pronoun.possessive.toLowerCase()] = pronoun;
    pronounUsageToPronouns[pronoun.possessivePronoun.toLowerCase()] = pronoun;
    pronounUsageToPronouns[pronoun.reflexive.toLowerCase()] = pronoun;
}

export default class PronounCommand extends MemberUniqueRoleCommandBase<IPronoun> {
    public readonly name = 'pronoun';
    public readonly aliases = ['pronouns'];
    public readonly feature = Features.Pronouns;

    public readonly helpDescription = 'Changes the pronouns that Phil uses to refer to you.';

    public readonly versionAdded = 13;

    protected getMissingCommandArgsErrorMessage(serverConfig: IServerConfig): string {
        return 'I will need you to specify which pronouns you would like me ' +
            'to use for you by using it as a command argument.\n\n' +
            this.getUsageMessage(serverConfig);
    }

    protected getInvalidInputErrorMessage(input: string, serverConfig: IServerConfig): string {
        return 'I didn\'t understand `' + input + '` as a pronoun that I know ' +
            'how to use.\n\n' + this.getUsageMessage(serverConfig);
    }

    protected tryParseInput(input: string): IPronoun {
        const pronoun = pronounUsageToPronouns[input.toLowerCase()];
        if (!pronoun) {
            return null;
        }

        return pronoun;
    }

    protected isRolePartOfUniquePool(role: DiscordIORole): boolean {
        const pronoun = getPronounFromRole(role);
        return (pronoun !== null);
    }

    protected doesRoleMatchData(role: DiscordIORole, data: IPronoun): boolean {
        const rolePronoun = getPronounFromRole(role);
        return (data === rolePronoun);
    }

    protected getRoleConfig(data: IPronoun): DiscordPromises.EditRoleOptions {
        return {
            name: data.roleName
        };
    }

    protected getSuccessMessage(serverConfig: IServerConfig, data: IPronoun): string {
        return 'I\'ve changed your pronouns to **' + data.subject + '/' +
            data.object + '/' + data.possessive + '**. If that was undesired, ' +
            'or if your pronouns change in the future, you can easily change ' +
            'them again by using `' + serverConfig.commandPrefix + 'pronoun`.';
    }

    private getUsageMessage(serverConfig: IServerConfig): string {
        let message = 'The pronouns that I know how to use right now are as follows:\n\n';

        for (const pronoun of AllPronouns) {
            message += this.getPronounUsage(pronoun);
            message += '\n';
        }

        const randomPronoun = BotUtils.getRandomArrayEntry(AllPronouns);
        message += '\nFor instance, if you would like **' + randomPronoun.displayName +
            '**, you can request those be the pronouns I use for you by saying `' +
            serverConfig.commandPrefix + 'pronoun ' + randomPronoun.subject + '`.';
        return message;
    }

    private getPronounUsage(pronoun: IPronoun): string {
        let usage = '**' + pronoun.displayName + '**, use: ';
        const uniqueChoices : Set<string> = new Set();
        usage = this.appendUsage(usage, pronoun.subject, uniqueChoices);
        usage = this.appendUsage(usage, pronoun.object, uniqueChoices);
        usage = this.appendUsage(usage, pronoun.possessive, uniqueChoices);
        usage = this.appendUsage(usage, pronoun.possessivePronoun, uniqueChoices);
        usage = this.appendUsage(usage, pronoun.reflexive, uniqueChoices);
        return usage;
    }

    private appendUsage(message: string, pronoun: string, usedText: Set<string>): string {
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
};
