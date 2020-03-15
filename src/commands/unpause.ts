import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
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
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      commandArgs,
      message.serverConfig,
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
      message.serverConfig.commandPrefix +
      'pause ' +
      bucket.handle +
      '`.';
    sendMessage(phil.bot, message.channelId, reply);
  }
}
