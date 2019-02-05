import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Versions from '../versions';
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
    const reply =
      '**Code:** Version ' +
      Versions.CODE +
      '.\n**Database:** Version ' +
      Versions.DATABASE +
      '.';
    return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
  }
}
