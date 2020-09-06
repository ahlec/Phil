import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { sendMessage } from '@phil/promises/discord';
import Command, { LoggerDefinition } from './@types';

export default class UnpauseCommand extends Command {
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

  public async processMessage(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      invocation.commandArgs,
      invocation.serverConfig,
      'bucket',
      true
    );
    await bucket.setIsPaused(phil.db, false);

    const reply =
      '**' +
      bucket.displayName +
      '** (' +
      bucket.handle +
      ') has been unpaused. You can pause it once more by using `' +
      invocation.serverConfig.commandPrefix +
      'pause ' +
      bucket.handle +
      '`.';
    await sendMessage(phil.bot, invocation.channelId, reply);
  }
}
