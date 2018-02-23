'use strict';

import { Command, ICommandLookup } from './@types';
import { HelpGroup, getHeaderForGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { MessageBuilder } from '../phil/message-builder';
import { instance as DiscordPromises } from '../promises/discord';
import { BotUtils } from '../phil/utils';
import { Versions } from '../phil/versions';

class CommandHelpInfo {
    public readonly name : string;
    public readonly helpGroup : HelpGroup;
    public readonly isAdminFunction : boolean;
    public readonly message : string;
    private readonly _isNew : boolean;
    private readonly _aliases : string[];
    private readonly _helpDescription : string;

    constructor(command : Command) {
        this.name = command.name;
        this.helpGroup = command.helpGroup;
        this.isAdminFunction = (command.publicRequiresAdmin === true);
        this._helpDescription = command.helpDescription;
        this._isNew = CommandHelpInfo.isVersionNew(command.versionAdded);
        this._aliases = command.aliases;

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

        message += '] ' + this._helpDescription + '\n';

        return message;
    }

    private static isVersionNew(version : number) : boolean {
        return (version >= Versions.CODE - 1);
    }
}

class HelpGroupInfo {
    private readonly _commands : CommandHelpInfo[] = [];
    private _hasNonAdminCommands : boolean;
    private readonly _header : string;

    constructor(public helpGroup : HelpGroup) {
        this._header += '\n\n**' + getHeaderForGroup(helpGroup) + '**\n';
    }

    public static sort(a : HelpGroupInfo, b : HelpGroupInfo) : number {
        return (a.helpGroup - b.helpGroup);
    }

    addCommandInfo(commandInfo : CommandHelpInfo) {
        this._commands.push(commandInfo);
        if (!commandInfo.isAdminFunction) {
            this._hasNonAdminCommands = true;
        }
    }

    finish() {
        this._commands.sort(CommandHelpInfo.sort);
    }

    append(builder : MessageBuilder, isAdminChannel : boolean) {
        if (!this.canAppearInChannel(isAdminChannel)) {
            return;
        }

        builder.append(this._header);

        for (let command of this._commands) {
            if (!isAdminChannel && command.isAdminFunction) {
                continue;
            }

            builder.append(command.message);
        }
    }

    private canAppearInChannel(isAdminChannel : boolean) : boolean {
        if (this._commands.length === 0) {
            return false;
        }

        if (isAdminChannel) {
            return true;
        }

        return (this.helpGroup !== HelpGroup.Admin && this._hasNonAdminCommands);
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

    public readonly name = 'help';
    public readonly aliases : string[] = [];

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Find out about all of the commands that Phil has available.';

    public readonly versionAdded = 3;

    public publicRequiresAdmin = false;
    public processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const isAdminChannel : boolean = BotUtils.isAdminChannel(message.channelId);
        const builder : MessageBuilder = new MessageBuilder();

        for (let helpGroup of this._helpGroups) {
            helpGroup.append(builder, isAdminChannel);
        }

        let sendPromise : Promise<string> = Promise.resolve('');
        for (let helpMessage of builder.messages) {
            sendPromise = sendPromise.then(() => DiscordPromises.sendMessage(bot, message.channelId, helpMessage));
        }

        return sendPromise;
    }

    public saveCommandDefinitions(commands : ICommandLookup) {
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
