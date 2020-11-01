import Member from '@phil/discord/Member';

import CommandArgs from '@phil/CommandArgs';
import CommandInvocation from '@phil/CommandInvocation';
import { greetMember } from '@phil/greeting';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Command, { LoggerDefinition } from './@types';

class WelcomeCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('welcome', parentDefinition, {
      helpDescription: 'Tests the welcome message for the server.',
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 14,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const targetMember = await this.getTargetMember(invocation);
    if (!targetMember) {
      await invocation.respond({
        error:
          "Hmmm, I don't know who to greet here. Could you try mentioning the user you'd like me to greet?",
        type: 'error',
      });
      return;
    }

    const greeting = greetMember(invocation.context.serverConfig, targetMember);
    if (!greeting.valid) {
      switch (greeting.reason) {
        case 'no-configured-welcome-message': {
          await invocation.respond({
            error: `Your server is not configured with a welcome message. An admin can change this by using \`${invocation.context.serverConfig.commandPrefix}config set welcome-message\`.`,
            type: 'error',
          });
          return;
        }
        default: {
          // This doesn't produce an error if you exhaustively handle every value in the string union.
          // If this line is producing an error, don't remove it -- handle the reason!
          return greeting.reason;
        }
      }
    }

    await invocation.respond(greeting.message);
  }

  private async getTargetMember(
    invocation: CommandInvocation
  ): Promise<Member | null> {
    const args = new CommandArgs(
      invocation.context.server,
      invocation.commandArgs
    );
    const member = await args.readMember('target', {
      isOptional: true,
    });
    if (member) {
      return member;
    }

    return invocation.member;
  }
}

export default WelcomeCommand;
