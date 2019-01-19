import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import UserTimezone from '../timezones/user-timezone';
import ICommand from './@types';

export default class TimediffCommand implements ICommand {
  public readonly name = 'timediff';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature = Features.TimezoneProcessing;
  public readonly permissionLevel = PermissionLevel.General;

  public readonly helpGroup = HelpGroup.Time;
  public readonly helpDescription =
    'Tells you the time difference (in hours) between you and the user that you mention with this command.';

  public readonly versionAdded = 10;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    if (message.mentions.length !== 1) {
      throw new Error(
        "In order to use this function, you must mention the user you're asking about. For instance, something like `" +
          message.serverConfig.commandPrefix +
          'timediff @Bunnymund#1234`.'
      );
    }

    const mention = message.mentions[0];
    if (mention.userId === message.userId) {
      return DiscordPromises.sendMessage(
        phil.bot,
        message.channelId,
        ':unamused:'
      );
    }

    const ownTimezone = await UserTimezone.getForUser(phil.db, message.userId);
    if (!ownTimezone || !ownTimezone.hasProvided) {
      throw new Error(
        'In order to use this command, you must first provide your timezone to me so I know how to convert your local time. You can use `' +
          message.serverConfig.commandPrefix +
          'timezone` to start that process.'
      );
    }

    const theirTimezone = await UserTimezone.getForUser(
      phil.db,
      mention.userId
    );
    if (!theirTimezone || !theirTimezone.hasProvided) {
      throw new Error(
        'The user you mentioned has not provided their timezone yet. They can do so by using `' +
          message.serverConfig.commandPrefix +
          "timezone`, but if they're unwilling to do so, you can always just ask them privately!"
      );
    }

    const hoursApart = ownTimezone.getHoursApart(theirTimezone);
    const reply = this.composeReply(hoursApart, mention.user);
    return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
  }

  private composeReply(hoursApart: number, otherUser: string): string {
    if (hoursApart === 0) {
      return 'The two of you are in the same timezone.';
    }

    const hourNoun = hoursApart === 1 || hoursApart === -1 ? 'hour' : 'hours';

    if (hoursApart < 0) {
      return (
        otherUser +
        ' is **' +
        Math.abs(hoursApart) +
        ' ' +
        hourNoun +
        '** behind you right now.'
      );
    }

    return (
      otherUser +
      ' is **' +
      hoursApart +
      ' ' +
      hourNoun +
      '** ahead of you right now.'
    );
  }
}
