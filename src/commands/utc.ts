import * as chronoNode from 'chrono-node';
import * as moment from 'moment-timezone';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import UserTimezone from '@phil/timezones/user-timezone';
import Command, { LoggerDefinition } from './@types';

function formatTimeToString(time: moment.Moment): string {
  return time.format('HH:mm (h:mm A)');
}

class UtcCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('utc', parentDefinition, {
      aliases: ['gmt'],
      feature: Features.TimezoneProcessing,
      helpDescription: 'Converts a time from your local timezone to UTC.',
      helpGroup: HelpGroup.Time,
      versionAdded: 10,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    const inputTime = this.getTimeFromCommandArgs(invocation.commandArgs);
    if (!inputTime) {
      throw new Error(
        'You must provide a time to this command so that I know what to convert to UTC. You can try using `' +
          invocation.context.serverConfig.commandPrefix +
          'utc 5pm` or `' +
          invocation.context.serverConfig.commandPrefix +
          'utc tomorrow at 11:30` to try it out.'
      );
    }

    const timezone = await UserTimezone.getForUser(
      database,
      invocation.member.user.id
    );
    if (!timezone || !timezone.hasProvided) {
      throw new Error(
        'In order to use this command, you must first provide your timezone to me so I know how to convert your local time. You can use `' +
          invocation.context.serverConfig.commandPrefix +
          'timezone` to start that process.'
      );
    }

    if (!timezone.timezoneName) {
      throw new Error(
        "Somehow has provided timezone but doesn't have specified timezoneName?"
      );
    }

    const reply = this.createReply(inputTime, timezone.timezoneName);
    await invocation.respond({
      color: 'purple',
      description: reply,
      fields: null,
      footer:
        "Converted from user's local timezone to UTC. If the time provided is incorrect, your timezone might need to be updated. Use " +
        invocation.context.serverConfig.commandPrefix +
        'timezone to change/set.',
      title: 'Timezone Conversion',
      type: 'embed',
    });
  }

  private getTimeFromCommandArgs(
    commandArgs: ReadonlyArray<string>
  ): moment.Moment | null {
    const content = commandArgs.join(' ').trim();
    if (content.length === 0) {
      return moment();
    }

    const dateTimes = chronoNode.parse(content);
    if (!dateTimes || dateTimes.length === 0) {
      return null;
    }

    if (!dateTimes[0].start.isCertain('hour')) {
      return null;
    }

    return moment(dateTimes[0].start.clone().date());
  }

  private createReply(inputTime: moment.Moment, timezoneName: string): string {
    let reply = formatTimeToString(inputTime) + ' local time is **';

    const timezoneOffset = moment().tz(timezoneName).utcOffset();
    inputTime.utcOffset(timezoneOffset);
    const utcTime = inputTime.tz('Etc/UTC');
    reply += formatTimeToString(utcTime);
    reply += '** UTC.';

    return reply;
  }
}

export default UtcCommand;
