import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import { PromptQueue } from '@phil/prompts/queue';
import Command, { LoggerDefinition } from './@types';

const MAX_QUEUE_DISPLAY_LENGTH = 10;

class QueueCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('queue', parentDefinition, {
      feature: Features.Prompts,
      helpDescription:
        'Displays the current queue of approved prompts that will show up in chat shortly.',
      helpGroup: HelpGroup.Prompts,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 7,
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
      'queue',
      false
    );
    const queue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      1,
      MAX_QUEUE_DISPLAY_LENGTH
    );

    await queue.postToChannel(phil.bot, phil.db, invocation);
  }
}

export default QueueCommand;
