import ICommand from 'commands/@types';
import Feature from 'features/feature';
import { IBatchFeaturesEnabledLookup } from 'features/feature-utils';
import { HelpGroup } from 'help-groups';
import Versions from 'versions';

export default class CommandHelpInfo {
    public static sort(a: CommandHelpInfo, b: CommandHelpInfo): number {
        if (a.name === b.name) {
            return 0;
        }

        if (a.isAdminFunction !== b.isAdminFunction) {
            return (a.isAdminFunction ? 1 : -1); // Admin functions should always come after non-admin functions
        }

        return (a.name < b.name ? -1 : 1);
    }

    private static isVersionNew(version: number): boolean {
        return (version >= Versions.CODE - 1);
    }

    public readonly name: string;
    public readonly helpGroup: HelpGroup;
    public readonly isAdminFunction: boolean;
    public readonly message: string;
    private readonly isNew: boolean;
    private readonly aliases: ReadonlyArray<string>;
    private readonly helpDescription: string;
    private readonly feature: Feature;

    constructor(command: ICommand) {
        this.name = command.name;
        this.helpGroup = command.helpGroup;
        this.isAdminFunction = (command.isAdminCommand === true);
        this.helpDescription = command.helpDescription;
        this.isNew = CommandHelpInfo.isVersionNew(command.versionAdded);
        this.aliases = command.aliases;
        this.feature = command.feature;

        this.message = this.createHelpMessage();
    }

    public shouldDisplay(isAdminChannel: boolean, featuresEnabledLookup: IBatchFeaturesEnabledLookup): boolean {
        if (!isAdminChannel && this.isAdminFunction) {
            return false;
        }

        if (this.feature && !featuresEnabledLookup[this.feature.id]) {
            return false;
        }

        return true;
    }

    private createHelpMessage(): string {
        let message = (this.isAdminFunction ? ':small_orange_diamond:' : ':small_blue_diamond:');

        if (this.isNew) {
            message += ':new:';
        }

        message += ' [`' + this.name + '`';
        if (this.aliases.length > 0) {
            message += ' (alias';
            if (this.aliases.length > 1) {
                message += 'es';
            }

            message += ': ';
            for (let index = 0; index < this.aliases.length; ++index) {
                if (index > 0) {
                    message += ', ';
                }

                message += '`' + this.aliases[index] + '`';
            }

            message += ')';
        }

        message += '] ' + this.helpDescription;
        return message;
    }
}
