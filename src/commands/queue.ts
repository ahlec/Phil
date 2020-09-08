import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const bucket = await invocation.retrieveBucketFromArguments();
    const queue = await bucket.getPromptQueue();
    const firstPage = await queue.getPage(1, MAX_QUEUE_DISPLAY_LENGTH);

    const { finalMessage } = await invocation.respond(
      firstPage.messageTemplate
    );

    const { reactableFactory } = firstPage;
    if (reactableFactory) {
      await reactableFactory.create(finalMessage);
    }
  }
}

export default QueueCommand;
