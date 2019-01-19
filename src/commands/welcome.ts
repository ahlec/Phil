import { User as DiscordIOUser } from 'discord.io';
import Greeting from '../greeting';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { BotUtils } from '../utils';
import ICommand from './@types';

import MemberTypeDefinition from '../type-definition/member';

type GetUserResult =
  | { success: true; user: DiscordIOUser }
  | { success: false; error: string };

const NOWRAP = '';

export default class WelcomeCommand implements ICommand {
  public readonly name = 'welcome';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature = null;
  public readonly permissionLevel = PermissionLevel.AdminOnly;

  public readonly helpGroup = HelpGroup.Admin;
  public readonly helpDescription = 'Tests the welcome message for the server.';

  public readonly versionAdded = 14;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    if (!message.serverConfig.welcomeMessage) {
      return BotUtils.sendErrorMessage({
        bot: phil.bot,
        channelId: message.channelId,
        message: `Your server is not configured with a welcome message. An admin can ${NOWRAP}change this by using \`${
          message.serverConfig.commandPrefix
        }config set ${NOWRAP}welcome-message\`.`,
      });
    }

    const result = this.getUser(phil, message, commandArgs);
    if (result.success !== true) {
      return BotUtils.sendErrorMessage({
        bot: phil.bot,
        channelId: message.channelId,
        message: result.error,
      });
    }

    const { user } = result;
    const member = message.serverConfig.server.members[user.id];
    const greeting = new Greeting(
      phil.bot,
      phil.db,
      message.serverConfig,
      member
    );
    await greeting.send(message.channelId);
  }

  private getUser(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): GetUserResult {
    if (commandArgs.length < 1) {
      return {
        success: true,
        user: message.user,
      };
    }

    const parseResult = MemberTypeDefinition.tryParse(commandArgs[0]);
    if (parseResult.wasSuccessful !== true) {
      return {
        error: parseResult.errorMessage,
        success: false,
      };
    }

    const { parsedValue: userId } = parseResult;
    const validityResult = MemberTypeDefinition.isValid(
      userId,
      phil,
      message.serverConfig
    );
    if (validityResult.isValid !== true) {
      return {
        error: validityResult.errorMessage,
        success: false,
      };
    }

    const user = phil.bot.users[userId];
    if (!user) {
      return {
        error: 'There is no user by that ID',
        success: false,
      };
    }

    return {
      success: true,
      user,
    };
  }
}
