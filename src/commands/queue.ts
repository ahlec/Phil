import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
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

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      legacyPhil,
      invocation.commandArgs,
      invocation.serverConfig,
      'queue',
      false
    );
    const queue = await PromptQueue.getPromptQueue(
      legacyPhil.bot,
      database,
      bucket,
      1,
      MAX_QUEUE_DISPLAY_LENGTH
    );

    await queue.postToChannel(legacyPhil.bot, database, invocation);
  }
}

export default QueueCommand;
