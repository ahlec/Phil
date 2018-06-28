import { Channel as DiscordIOChannel } from 'discord.io';
import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import { ConfigCommandBase, IConfigProperty } from './bases/config-command-base';

import ChannelTypeDefinition from '../type-definition/channel';
import CommandPrefixTypeDefinition from '../type-definition/command-prefix';

// -----------------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------------

function getChannelId(channel: DiscordIOChannel): string {
    if (!channel) {
        return null;
    }

    return channel.id;
}

function getRandomChannelId(serverConfig: ServerConfig): string {
    const channelIds = Object.keys(serverConfig.server.channels);
    return BotUtils.getRandomArrayEntry(channelIds);
}

// -----------------------------------------------------------------------------------
// Properties
// -----------------------------------------------------------------------------------

const NOWRAP = '';

const properties: ReadonlyArray<IConfigProperty<ServerConfig>> = [
    {
        defaultValue: null,
        description: `This is an optional channel for admins intended for performing admin bot ${
            NOWRAP}commands in. If provided, Phil will also send all admin-intended messages to ${
            NOWRAP}this channel. This can be a channel that is used for other properties/purposes ${
            NOWRAP}or one that is unique to this purpose.`,
        displayName: 'Bot Control Channel',
        key: 'bot-control-channel',
        typeDefinition: ChannelTypeDefinition,

        getRandomExampleValue: getRandomChannelId,
        getValue: (model: ServerConfig) => getChannelId(model.botControlChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setBotControlChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: `This is the optional designated admin channel for this server. This can be ${
            NOWRAP}a channel that is used for other properties/purposes or one that is unique to ${
            NOWRAP}this purpose.`,
        displayName: 'Admin Channel',
        key: 'admin-channel',
        typeDefinition: ChannelTypeDefinition,

        getRandomExampleValue: getRandomChannelId,
        getValue: (model: ServerConfig) => getChannelId(model.adminChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setAdminChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: `This is the optional channel where Phil will post welcome messages for new ${
            NOWRAP}users, if configured to do so. This can be a channel that is used for other ${
            NOWRAP}properties/purposes or one that is unique to this purpose.`,
        displayName: 'Introductions Channel',
        key: 'introductions-channel',
        typeDefinition: ChannelTypeDefinition,

        getRandomExampleValue: getRandomChannelId,
        getValue: (model: ServerConfig) => getChannelId(model.introductionsChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setIntroductionsChannel(newValue, phil.db)
    },
    {
        defaultValue: null,
        description: `This is the optional channel where Phil will post calendar and birthday ${
            NOWRAP}notifications, and where the \`news\` command will echo output to. This can be ${
            NOWRAP}a channel that is used for other properties/purposes or one that is unique to ${
            NOWRAP}this purpose.`,
        displayName: 'News Channel',
        key: 'news-channel',
        typeDefinition: ChannelTypeDefinition,

        getRandomExampleValue: getRandomChannelId,
        getValue: (model: ServerConfig) => getChannelId(model.newsChannel),
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setNewsChannel(newValue, phil.db)
    },
    {
        defaultValue: 'p!',
        description: `This is the prefix that is required at the start of all commands for Phil ${
            NOWRAP}to recognize as his own.`,
        displayName: 'Command Prefix',
        key: 'command-prefix',
        typeDefinition: CommandPrefixTypeDefinition,

        getRandomExampleValue: (model: ServerConfig) => 'p!',
        getValue: (model: ServerConfig) => model.commandPrefix,
        setValue: (phil: Phil, model: ServerConfig, newValue: string) =>
            model.setCommandPrefix(newValue, phil.db)
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

    protected readonly configurationFor = 'server';

    constructor() {
        super(properties);
    }

    protected async getModel(phil: Phil, message: PublicMessage, mutableArgs: string[]): Promise<ServerConfig> {
        return message.serverConfig;
    }
}
