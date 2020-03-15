import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
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
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      commandArgs,
      message.serverConfig,
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
      message.serverConfig.commandPrefix +
      'unpause ' +
      bucket.handle +
      '`.';
    await sendMessage(phil.bot, message.channelId, reply);
  }
}
