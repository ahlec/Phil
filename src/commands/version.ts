import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import { CODE_VERSION, DATABASE_VERSION } from '../versions';
import Command, { LoggerDefinition } from './@types';

export default class VersionCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('version', parentDefinition, {
      aliases: ['versions'],
      helpDescription:
        'Prints out the current version numbers related to Phil.',
      permissionLevel: PermissionLevel.BotManagerOnly,
      versionAdded: 3,
    });
  }

  public processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    return DiscordPromises.sendMessage(
      phil.bot,
      message.channelId,
      `**Code**: v${CODE_VERSION.format()}\n**Database**: v${DATABASE_VERSION}`
    );
  }
}
