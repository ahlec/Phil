import * as chronoNode from 'chrono-node';
import { Server as DiscordIOServer } from 'discord.io';
import CalendarMonth from '../calendar/calendar-month';
import Features from '../features/all-features';
import MessageBuilder from '../message-builder';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { sendMessageBuilder } from '../promises/discord';
import ServerConfig from '../server-config';
import Command, { LoggerDefinition } from './@types';

export default class CalendarCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('calendar', parentDefinition, {
      feature: Features.Calendar,
      helpDescription:
        'Has Phil display the calendar of server events for the month in question.',
      versionAdded: 6,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const month = this.determineMonth(message.serverConfig, commandArgs);
    const calendar = await CalendarMonth.getForMonth(
      phil.bot,
      phil.db,
      message.server,
      month
    );
    const builder = this.composeMessageFromCalendar(message.server, calendar);
    await sendMessageBuilder(phil.bot, message.channelId, builder);
  }

  private determineMonth(
    serverConfig: ServerConfig,
    commandArgs: ReadonlyArray<string>
  ): number {
    const input = commandArgs.join(' ').trim();
    if (input === '') {
      const now = new Date();
      return now.getUTCMonth() + 1;
    }

    const inputDate = chronoNode.parseDate(input);
    if (inputDate === null) {
      throw new Error(
        "I couldn't understand what month you were trying to get the calendar for. Please try requesting `" +
          serverConfig.commandPrefix +
          'calendar` or `' +
          serverConfig.commandPrefix +
          "calendar december` to target a month that isn't this month."
      );
    }

    return inputDate.getUTCMonth() + 1;
  }

  private composeMessageFromCalendar(
    server: DiscordIOServer,
    calendar: CalendarMonth
  ): MessageBuilder {
    const builder = new MessageBuilder();
    builder.append(
      calendar.definition.emoji +
        ' **' +
        calendar.definition.fullName +
        '** calendar for the ' +
        server.name +
        ' Server\n\n'
    );

    let hasEventsThisMonth = false;
    for (let index = 0; index < calendar.days.length; ++index) {
      const day = calendar.days[index];
      const dayPrefix =
        index + 1 + ' ' + calendar.definition.abbreviation + ': ';

      for (const event of day) {
        hasEventsThisMonth = true;
        builder.append(dayPrefix + event + '\n');
      }
    }

    if (!hasEventsThisMonth) {
      builder.append("There don't appear to be any events during this month.");
    }

    return builder;
  }
}
