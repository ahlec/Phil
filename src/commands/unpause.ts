import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
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

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      legacyPhil,
      invocation.commandArgs,
      invocation.serverConfig,
      'bucket',
      true
    );
    await bucket.setIsPaused(database, false);

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
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
  }
}

export default UnpauseCommand;
