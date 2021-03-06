import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Command, { LoggerDefinition } from './@types';

class UnpauseCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('unpause', parentDefinition, {
      aliases: ['resume'],
      feature: Features.Prompts,
      helpDescription:
        'Unpauses a prompt bucket that had been paused earlier from posting any new prompts.',
      helpGroup: HelpGroup.Prompts,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 11,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const bucket = await invocation.retrieveBucketFromArguments({
      allowInvalid: true,
    });
    await bucket.setIsPaused(false);

    const reply =
      '**' +
      bucket.displayName +
      '** (' +
      bucket.handle +
      ') has been unpaused. You can pause it once more by using `' +
      invocation.context.serverConfig.commandPrefix +
      'pause ' +
      bucket.handle +
      '`.';
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
  }
}

export default UnpauseCommand;
