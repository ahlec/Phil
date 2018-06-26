import { Channel as DiscordIOChannel } from 'discord.io';
import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import ServerConfig from '../server-config';
import { ConfigCommandBase, IConfigProperty } from './bases/config-command-base';

import ChannelValueInterpreter from '../value-interpreters/channel';

// -----------------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------------

function getChannelId(channel: DiscordIOChannel): string {
    if (!channel) {
        return null;
    }

    return channel.id;
}

// -----------------------------------------------------------------------------------
// Properties
// -----------------------------------------------------------------------------------

const properties: ReadonlyArray<IConfigProperty<ServerConfig>> = [
    {
        defaultValue: null,
        displayName: 'Admin Channel',
        isClearable: true,
        key: 'admin-channel',
        valueInterpreter: ChannelValueInterpreter,

        getValue: (model: ServerConfig) => getChannelId(model.adminChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setAdminChannel(newValue, phil.db)
    }
];

// -----------------------------------------------------------------------------------
// Command
// -----------------------------------------------------------------------------------

export default class ConfigCommand extends ConfigCommandBase<ServerConfig> {
    public readonly name = 'config';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.Admin;
    public readonly helpDescription = 'Displays or changes the configuration settings for this server.';

    public readonly versionAdded = 14;

    public readonly isAdminCommand = true;

    constructor() {
        super(properties);
    }

    protected async getModel(phil: Phil, message: PublicMessage, mutableArgs: string[]): Promise<ServerConfig> {
        return message.serverConfig;
    }
}
