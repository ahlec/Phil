import * as chronoNode from 'chrono-node';
import { Server as DiscordIOServer } from 'discord.io';
import CommandInvocation from '@phil/CommandInvocation';
import CalendarMonth from '@phil/calendar/calendar-month';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import MessageBuilder from '@phil/message-builder';
import Phil from '@phil/phil';
import ServerConfig from '@phil/server-config';
import Command, { LoggerDefinition } from './@types';

class CalendarCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('calendar', parentDefinition, {
      feature: Features.Calendar,
      helpDescription:
        'Has Phil display the calendar of server events for the month in question.',
      versionAdded: 6,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const month = this.determineMonth(
      invocation.context.serverConfig,
      invocation.commandArgs
    );
    const calendar = await CalendarMonth.getForMonth(
      legacyPhil.bot,
      database,
      invocation.server,
      month
    );
    const builder = this.composeMessageFromCalendar(
      invocation.server,
      calendar
    );
    await invocation.respond({
      text: builder,
      type: 'plain',
    });
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

export default CalendarCommand;
