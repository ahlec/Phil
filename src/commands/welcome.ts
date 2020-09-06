import { User as DiscordIOUser } from 'discord.io';
import CommandInvocation from '@phil/CommandInvocation';
import Greeting from '@phil/greeting';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { sendErrorMessage } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

import MemberTypeDefinition from '@phil/type-definition/member';

type GetUserResult =
  | { success: true; user: DiscordIOUser }
  | { success: false; error: string };

const NOWRAP = '';

export default class WelcomeCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('welcome', parentDefinition, {
      helpDescription: 'Tests the welcome message for the server.',
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 14,
    });
  }

  public async processMessage(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    if (!invocation.serverConfig.welcomeMessage) {
      await sendErrorMessage({
        bot: phil.bot,
        channelId: invocation.channelId,
        message: `Your server is not configured with a welcome message. An admin can ${NOWRAP}change this by using \`${invocation.serverConfig.commandPrefix}config set ${NOWRAP}welcome-message\`.`,
      });
      return;
    }

    const result = this.getUser(phil, invocation);
    if (result.success !== true) {
      await sendErrorMessage({
        bot: phil.bot,
        channelId: invocation.channelId,
        message: result.error,
      });
      return;
    }

    const { user } = result;
    const member = invocation.serverConfig.server.members[user.id];
    const greeting = new Greeting(
      phil.bot,
      phil.db,
      invocation.serverConfig,
      member
    );
    await greeting.send(invocation.channelId);
  }

  private getUser(phil: Phil, invocation: CommandInvocation): GetUserResult {
    if (invocation.commandArgs.length < 1) {
      return {
        success: true,
        user: invocation.user,
      };
    }

    const parseResult = MemberTypeDefinition.tryParse(
      invocation.commandArgs[0]
    );
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
      invocation.serverConfig
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
