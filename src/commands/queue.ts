import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { PromptQueue } from '../prompts/queue';
import Command, { LoggerDefinition } from './@types';

const MAX_QUEUE_DISPLAY_LENGTH = 10;

export default class QueueCommand extends Command {
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
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      commandArgs,
      message.serverConfig,
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

    await queue.postToChannel(phil.bot, phil.db, message);
  }
}
