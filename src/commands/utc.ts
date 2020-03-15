import * as chronoNode from 'chrono-node';
import * as moment from 'moment-timezone';
import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { sendEmbedMessage } from '../promises/discord';
import UserTimezone from '../timezones/user-timezone';
import Command, { LoggerDefinition } from './@types';

function formatTimeToString(time: moment.Moment): string {
  return time.format('HH:mm (h:mm A)');
}

export default class UtcCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('utc', parentDefinition, {
      aliases: ['gmt'],
      feature: Features.TimezoneProcessing,
      helpDescription: 'Converts a time from your local timezone to UTC.',
      helpGroup: HelpGroup.Time,
      versionAdded: 10,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const inputTime = this.getTimeFromCommandArgs(commandArgs);
    if (!inputTime) {
      throw new Error(
        'You must provide a time to this command so that I know what to convert to UTC. You can try using `' +
          message.serverConfig.commandPrefix +
          'utc 5pm` or `' +
          message.serverConfig.commandPrefix +
          'utc tomorrow at 11:30` to try it out.'
      );
    }

    const timezone = await UserTimezone.getForUser(phil.db, message.userId);
    if (!timezone || !timezone.hasProvided) {
      throw new Error(
        'In order to use this command, you must first provide your timezone to me so I know how to convert your local time. You can use `' +
          message.serverConfig.commandPrefix +
          'timezone` to start that process.'
      );
    }

    const reply = this.createReply(inputTime, timezone);
    await sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Timezone,
      description: reply,
      footer: {
        text:
          "Converted from user's local timezone to UTC. If the time provided is incorrect, your timezone might need to be updated. Use " +
          message.serverConfig.commandPrefix +
          'timezone to change/set.',
      },
      title: 'Timezone Conversion',
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

    const m = dateTimes[0].start.clone().moment() as any; // doesn't have .tz()
    return moment(m); // clone it and make sure we define .tz()
  }

  private createReply(
    inputTime: moment.Moment,
    timezone: UserTimezone
  ): string {
    let reply = formatTimeToString(inputTime) + ' local time is **';

    const timezoneOffset = moment()
      .tz(timezone.timezoneName!)
      .utcOffset();
    inputTime.utcOffset(timezoneOffset);
    const utcTime = inputTime.tz('Etc/UTC');
    reply += formatTimeToString(utcTime);
    reply += '** UTC.';

    return reply;
  }
}
