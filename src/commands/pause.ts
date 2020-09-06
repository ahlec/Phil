import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import Command, { LoggerDefinition } from './@types';

class PauseCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('pause', parentDefinition, {
      feature: Features.Prompts,
      helpDescription: 'Pauses a prompt bucket from posting any new prompts.',
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
      invocation.context.serverConfig,
      'bucket',
      true
    );
    await bucket.setIsPaused(database, true);

    const reply =
      '**' +
      bucket.displayName +
      '** (' +
      bucket.handle +
      ') has been paused. You can resume it by using `' +
      invocation.context.serverConfig.commandPrefix +
      'unpause ' +
      bucket.handle +
      '`.';
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
  }
}

export default PauseCommand;
