import { endOngoingDirectMessageProcesses } from '../DirectMessageUtils';
import EmbedColor from '../embed-color';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Command, { LoggerDefinition } from './@types';

export default class InviteCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('invite', parentDefinition, {
      aliases: ['invitelink'],
      helpDescription:
        'Sends you a direct message with the URL to invite Phil to your server',
      helpGroup: HelpGroup.None,
      permissionLevel: PermissionLevel.BotManagerOnly,
      versionAdded: 14,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage
  ): Promise<any> {
    await endOngoingDirectMessageProcesses(phil, message.userId);
    await DiscordPromises.sendEmbedMessage(phil.bot, message.userId, {
      color: EmbedColor.Info,
      description: phil.bot.inviteURL,
      title: ':gift: My Invite Link',
    });
  }
}
