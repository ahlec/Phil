'use strict';

import { Command, ICommandLookup } from './@types';
import { HelpGroup, getHeaderForGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { MessageBuilder } from '../phil/message-builder';
import { DiscordPromises } from '../promises/discord';
import { BotUtils } from '../phil/utils';
import { Versions } from '../phil/versions';
import { Feature, BatchFeaturesEnabledLookup, FeatureUtils } from '../phil/features';

class CommandHelpInfo {
    public readonly name : string;
    public readonly helpGroup : HelpGroup;
    public readonly isAdminFunction : boolean;
    public readonly message : string;
    private readonly _isNew : boolean;
    private readonly _aliases : string[];
    private readonly _helpDescription : string;
    private readonly _feature : Feature;

    constructor(command : Command) {
        this.name = command.name;
        this.helpGroup = command.helpGroup;
        this.isAdminFunction = (command.publicRequiresAdmin === true);
        this._helpDescription = command.helpDescription;
        this._isNew = CommandHelpInfo.isVersionNew(command.versionAdded);
        this._aliases = command.aliases;
        this._feature = command.feature;

        this.message = this.createHelpMessage();
    }

    public static sort(a : CommandHelpInfo, b : CommandHelpInfo) : number {
        if (a.name === b.name) {
            return 0;
        }

        if (a.isAdminFunction !== b.isAdminFunction) {
            return (a.isAdminFunction ? 1 : -1); // Admin functions should always come after non-admin functions
        }

        return (a.name < b.name ? -1 : 1);
    }

    shouldDisplay(isAdminChannel : boolean, featuresEnabledLookup : BatchFeaturesEnabledLookup) : boolean {
        if (!isAdminChannel && this.isAdminFunction) {
            return false;
        }

        if (this._feature && !featuresEnabledLookup[this._feature.id]) {
            return false;
        }

        return true;
    }

    private createHelpMessage() : string {
        var message = (this.isAdminFunction ? ':small_orange_diamond:' : ':small_blue_diamond:');

        if (this._isNew) {
            message += ':new:';
        }

        message += ' [`' + this.name + '`';
        if (this._aliases.length > 0) {
            message += ' (alias';
            if (this._aliases.length > 1) {
                message += 'es';
            }

            message += ': ';
            for (let index = 0; index < this._aliases.length; ++index) {
                if (index > 0) {
                    message += ', ';
                }

                message += '`' + this._aliases[index] + '`';
            }

            message += ')';
        }

        message += '] ' + this._helpDescription;
        return message;
    }

    private static isVersionNew(version : number) : boolean {
        return (version >= Versions.CODE - 1);
    }
}

class HelpGroupInfo {
    private readonly _commands : CommandHelpInfo[] = [];
    private readonly _header : string;

    constructor(public helpGroup : HelpGroup) {
        this._header = '\n\n**' + getHeaderForGroup(helpGroup) + '**\n';
    }

    public static sort(a : HelpGroupInfo, b : HelpGroupInfo) : number {
        return (a.helpGroup - b.helpGroup);
    }

    addCommandInfo(commandInfo : CommandHelpInfo) {
        this._commands.push(commandInfo);
    }

    finish() {
        this._commands.sort(CommandHelpInfo.sort);
    }

    shouldDisplay(isAdminChannel : boolean, featuresEnabledLookup : BatchFeaturesEnabledLookup) : boolean {
        for (let command of this._commands) {
            if (command.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
                return true;
            }
        }

        return false;
    }

    append(builder : MessageBuilder, isAdminChannel : boolean, featuresEnabledLookup : BatchFeaturesEnabledLookup) {
        builder.append(this._header);

        for (let command of this._commands) {
            if (!command.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
                continue;
            }

            builder.append(command.message + '\n');
        }
    }
}

function isVisibleCommand(commandName : string, command : Command) : boolean {
    if (command.aliases.indexOf(commandName) >= 0) {
        return false;
    }

    if (command.helpGroup === HelpGroup.None) {
        return false;
    }

    return true;
}

export class HelpCommand implements Command {
    private _helpGroups : HelpGroupInfo[] = [];

    readonly name = 'help';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Find out about all of the commands that Phil has available.';

    readonly versionAdded = 3;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const isAdminChannel = BotUtils.isAdminChannel(message.channelId);
        const featuresEnabledLookup = await FeatureUtils.getServerFeaturesStatus(db, message.server.id);
        const builder = new MessageBuilder();

        for (let helpGroup of this._helpGroups) {
            if (!helpGroup.shouldDisplay(isAdminChannel, featuresEnabledLookup)) {
                continue;
            }

            helpGroup.append(builder, isAdminChannel, featuresEnabledLookup);
        }

        for (let helpMessage of builder.messages) {
            await DiscordPromises.sendMessage(bot, message.channelId, helpMessage);
        }
    }

    saveCommandDefinitions(commands : ICommandLookup) {
        const commandInfo = this.getAllCommandHelpInfo(commands);
        const groupLookup : { [groupNum : number ] : HelpGroupInfo } = {};

        for (let info of commandInfo) {
            if (!groupLookup[info.helpGroup]) {
                groupLookup[info.helpGroup] = new HelpGroupInfo(info.helpGroup);
            }

            groupLookup[info.helpGroup].addCommandInfo(info);
        }

        for (let groupNum in groupLookup) {
            let group = groupLookup[groupNum];
            group.finish();
            this._helpGroups.push(group);
        }

        this._helpGroups.sort(HelpGroupInfo.sort);
    }

    private getAllCommandHelpInfo(commands : ICommandLookup) : CommandHelpInfo[] {
        const commandInfo : CommandHelpInfo[] = [];
        for (let commandName in commands) {
            let command = commands[commandName];
            if (!isVisibleCommand(commandName, command)) {
                continue;
            }

            let helpInfo = new CommandHelpInfo(command);
            commandInfo.push(helpInfo);
        }

        return commandInfo;
    }
};
