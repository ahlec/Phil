import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { sendMessage } from '@phil/promises/discord';
import Command, { LoggerDefinition } from './@types';

export default class PauseCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('pause', parentDefinition, {
      feature: Features.Prompts,
      helpDescription: 'Pauses a prompt bucket from posting any new prompts.',
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
    await bucket.setIsPaused(phil.db, true);

    const reply =
      '**' +
      bucket.displayName +
      '** (' +
      bucket.handle +
      ') has been paused. You can resume it by using `' +
      invocation.serverConfig.commandPrefix +
      'unpause ' +
      bucket.handle +
      '`.';
    await sendMessage(phil.bot, invocation.channelId, reply);
  }
}
