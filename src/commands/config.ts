import { Channel as DiscordIOChannel } from 'discord.io';
import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import ServerConfig from '../server-config';
import { ConfigCommandBase, IConfigProperty } from './bases/config-command-base';

import ChannelTypeDefinition from '../type-definition/channel';

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
        description: 'This is an optional channel for admins intended for performing admin bot commands in. If provided, Phil will also send all admin-intended messages to this channel.',
        displayName: 'Bot Control Channel',
        isClearable: true,
        key: 'bot-control-channel',
        typeDefinition: ChannelTypeDefinition,

        getValue: (model: ServerConfig) => getChannelId(model.botControlChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setBotControlChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: 'This is the optional designated admin channel for this server.',
        displayName: 'Admin Channel',
        isClearable: true,
        key: 'admin-channel',
        typeDefinition: ChannelTypeDefinition,

        getValue: (model: ServerConfig) => getChannelId(model.adminChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setAdminChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: 'This is the optional channel where Phil will post welcome messages for new users, if configured to do so.',
        displayName: 'Introductions Channel',
        isClearable: true,
        key: 'introductions-channel',
        typeDefinition: ChannelTypeDefinition,

        getValue: (model: ServerConfig) => getChannelId(model.introductionsChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setIntroductionsChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: 'This is the optional channel where Phil will post calendar and birthday notifications, and where the `news` command will echo output to.',
        displayName: 'News Channel',
        isClearable: true,
        key: 'news-channel',
        typeDefinition: ChannelTypeDefinition,

        getValue: (model: ServerConfig) => getChannelId(model.newsChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setNewsChannel(newValue, phil.db)
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
