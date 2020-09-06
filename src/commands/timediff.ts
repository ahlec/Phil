import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import UserTimezone from '@phil/timezones/user-timezone';
import Command, { LoggerDefinition } from './@types';

class TimediffCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('timediff', parentDefinition, {
      feature: Features.TimezoneProcessing,
      helpDescription:
        'Tells you the time difference (in hours) between you and the user that you mention with this command.',
      helpGroup: HelpGroup.Time,
      versionAdded: 10,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    if (invocation.mentions.length !== 1) {
      throw new Error(
        "In order to use this function, you must mention the user you're asking about. For instance, something like `" +
          invocation.serverConfig.commandPrefix +
          'timediff @Bunnymund#1234`.'
      );
    }

    const mention = invocation.mentions[0];
    if (mention.userId === invocation.userId) {
      await invocation.respond({
        text: ':unamused:',
        type: 'plain',
      });
      return;
    }

    const ownTimezone = await UserTimezone.getForUser(
      database,
      invocation.userId
    );
    if (!ownTimezone || !ownTimezone.hasProvided) {
      throw new Error(
        'In order to use this command, you must first provide your timezone to me so I know how to convert your local time. You can use `' +
          invocation.serverConfig.commandPrefix +
          'timezone` to start that process.'
      );
    }

    const theirTimezone = await UserTimezone.getForUser(
      database,
      mention.userId
    );
    if (!theirTimezone || !theirTimezone.hasProvided) {
      throw new Error(
        'The user you mentioned has not provided their timezone yet. They can do so by using `' +
          invocation.serverConfig.commandPrefix +
          "timezone`, but if they're unwilling to do so, you can always just ask them privately!"
      );
    }

    const hoursApart = ownTimezone.getHoursApart(theirTimezone);
    const reply = this.composeReply(hoursApart, mention.user);
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
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

export default TimediffCommand;
