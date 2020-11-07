import Server from '@phil/discord/Server';

import CommandInvocation from '@phil/CommandInvocation';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry } from '@phil/utils';
import { LoggerDefinition } from './@types';
import { ConfigCommandBase, ConfigProperty } from './bases/config-command-base';

import ClearConfigAction from './bases/config-actions/clear';
import DisplayConfigAction from './bases/config-actions/display';
import InfoConfigAction from './bases/config-actions/info';
import SetConfigAction from './bases/config-actions/set';

import ChannelTypeDefinition from '@phil/type-definition/channel';
import CommandPrefixTypeDefinition from '@phil/type-definition/command-prefix';
import RoleTypeDefinition from '@phil/type-definition/role';
import WelcomeMessageTypeDefinition from '@phil/type-definition/welcome-message';

// -----------------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------------

function getRandomChannelId(server: Server): string {
  const randomChannel = getRandomArrayEntry(server.textChannels);
  return randomChannel.id;
}

// -----------------------------------------------------------------------------------
// Properties
// -----------------------------------------------------------------------------------

const NOWRAP = '';
const NEWLINE = '\n';

const properties: ReadonlyArray<ConfigProperty<ServerConfig>> = [
  {
    defaultValue: null,
    description: `This is an optional channel for admins intended for performing admin bot ${NOWRAP}commands in. If provided, Phil will also send all admin-intended messages to ${NOWRAP}this channel. This can be a channel that is used for other properties/purposes ${NOWRAP}or one that is unique to this purpose.`,
    displayName: 'Bot Control Channel',
    getRandomExampleValue: getRandomChannelId,
    getValue: (model: ServerConfig): string | null => {
      const channel = model.botControlChannel;
      if (!channel) {
        return null;
      }

      return channel.id;
    },
    key: 'bot-control-channel',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setBotControlChannel(newValue),
    typeDefinition: ChannelTypeDefinition,
  },
  {
    defaultValue: null,
    description: `This is the optional designated admin channel for this server. This can be ${NOWRAP}a channel that is used for other properties/purposes or one that is unique to ${NOWRAP}this purpose.`,
    displayName: 'Admin Channel',
    getRandomExampleValue: getRandomChannelId,
    getValue: (model: ServerConfig): string | null => {
      const channel = model.adminChannel;
      if (!channel) {
        return null;
      }

      return channel.id;
    },
    key: 'admin-channel',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setAdminChannel(newValue),
    typeDefinition: ChannelTypeDefinition,
  },
  {
    defaultValue: null,
    description: `This is the optional channel where Phil will post welcome messages for new ${NOWRAP}users, if configured to do so. This can be a channel that is used for other ${NOWRAP}properties/purposes or one that is unique to this purpose.`,
    displayName: 'Introductions Channel',
    getRandomExampleValue: getRandomChannelId,
    getValue: (model: ServerConfig): string | null => {
      const channel = model.introductionsChannel;
      if (!channel) {
        return null;
      }

      return channel.id;
    },
    key: 'introductions-channel',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setIntroductionsChannel(newValue),
    typeDefinition: ChannelTypeDefinition,
  },
  {
    defaultValue: null,
    description: `This is the optional channel where Phil will post calendar and birthday ${NOWRAP}notifications, and where the \`news\` command will echo output to. This can be ${NOWRAP}a channel that is used for other properties/purposes or one that is unique to ${NOWRAP}this purpose.`,
    displayName: 'News Channel',
    getRandomExampleValue: getRandomChannelId,
    getValue: (model: ServerConfig): string | null => {
      const channel = model.newsChannel;
      if (!channel) {
        return null;
      }

      return channel.id;
    },
    key: 'news-channel',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setNewsChannel(newValue),
    typeDefinition: ChannelTypeDefinition,
  },
  {
    defaultValue: 'p!',
    description: `This is the prefix that is required at the start of all commands for Phil ${NOWRAP}to recognize as his own.`,
    displayName: 'Command Prefix',
    getRandomExampleValue: (): string => 'p!',
    getValue: (model: ServerConfig): string | null => model.commandPrefix,
    key: 'command-prefix',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setCommandPrefix(newValue),
    typeDefinition: CommandPrefixTypeDefinition,
  },
  {
    defaultValue: null,
    description: `This is a role that a user must have in order to make use of any of the ${NOWRAP}admin-only commands. The server owner is capable of making use of the admin-${NOWRAP}only commands at all times, but for all other members of the server, they must ${NOWRAP}have the role specified here in order to user the higher privilege commands.${NEWLINE}${NEWLINE}Note that while admin commands may be used in any channel within the server, ${NOWRAP}admin-only commands will only appear in the \`help\` command list if you use ${NOWRAP}the command within the **Admin Channel** (property key: \`admin-channel\`) or ${NOWRAP}within the **Bot Control Channel** (property key: \`bot-control-channel\`).`,
    displayName: 'Admin Role',
    getRandomExampleValue: async (server: Server): Promise<string> => {
      const roles = await server.getAllRoles();
      const randomRole = getRandomArrayEntry(roles);
      return randomRole.id;
    },
    getValue: (model: ServerConfig): string | null => {
      if (!model.adminRole) {
        return null;
      }

      return model.adminRole.id;
    },
    key: 'admin-role',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setAdminRole(newValue),
    typeDefinition: RoleTypeDefinition,
  },
  {
    defaultValue: null,
    description: `The welcome message that is posted to the introductions channel ${NOWRAP}(config key: \`introductions-channel\`) whenever a new user joins the server. ${NOWRAP}You are capable of previewing the welcome message at any time using the ${NOWRAP}\`welcome\` admin command.${NEWLINE}${NEWLINE}Instances of \`{user}\` within the welcome message will be replaced with the ${NOWRAP}new user's name.`,
    displayName: 'Welcome Message',
    getRandomExampleValue: (): string => 'Welcome to our server, {user}!',
    getValue: (model: ServerConfig): string | null => model.welcomeMessage,
    key: 'welcome-message',
    setValue: (model: ServerConfig, newValue: string): Promise<boolean> =>
      model.setWelcomeMessage(newValue),
    typeDefinition: WelcomeMessageTypeDefinition,
  },
];

// -----------------------------------------------------------------------------------
// Command
// -----------------------------------------------------------------------------------

class ConfigCommand extends ConfigCommandBase<ServerConfig> {
  constructor(parentDefinition: LoggerDefinition) {
    super('config', parentDefinition, {
      configurationFor: 'server',
      helpDescription:
        'Displays or changes the configuration settings for this server.',
      orderedActions: [
        new DisplayConfigAction<ServerConfig>(),
        new InfoConfigAction<ServerConfig>(),
        new SetConfigAction<ServerConfig>(),
        new ClearConfigAction<ServerConfig>(),
      ],
      properties,
      versionAdded: 14,
    });
  }

  protected async getModel(
    invocation: CommandInvocation
  ): Promise<ServerConfig> {
    return invocation.context.serverConfig;
  }
}

export default ConfigCommand;
