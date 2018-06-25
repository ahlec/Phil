import CalendarMonth from 'calendar/calendar-month';
import { Server as DiscordIOServer } from 'discord.io';
import Features from 'features/all-features';
import { HelpGroup } from 'help-groups';
import MessageBuilder from 'message-builder';
import PublicMessage from 'messages/public';
import Phil from 'phil';
import { DiscordPromises } from 'promises/discord';
import ServerConfig from 'server-config';
import ICommand from './@types';

const chronoNode = require('chrono-node');

export default class CalendarCommand implements ICommand {
    public readonly name = 'calendar';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Calendar;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Has Phil display the calendar of server events for the month in question.';

    public readonly versionAdded = 6;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const month = this.determineMonth(message.serverConfig, commandArgs);
        const calendar = await CalendarMonth.getForMonth(phil.bot, phil.db, message.server, month);
        const builder = this.composeMessageFromCalendar(message.server, calendar);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, builder);
    }

    private determineMonth(serverConfig: ServerConfig, commandArgs: ReadonlyArray<string>): number {
        const input = commandArgs.join(' ').trim();
        if (input === '') {
            const now = new Date();
            return now.getUTCMonth() + 1;
        }

        const inputDate = chronoNode.parseDate(input);
        if (inputDate === null) {
            throw new Error('I couldn\'t understand what month you were trying to get the calendar for. Please try requesting `' + serverConfig.commandPrefix + 'calendar` or `' + serverConfig.commandPrefix + 'calendar december` to target a month that isn\'t this month.');
        }

        return inputDate.getUTCMonth() + 1;
    }

    private composeMessageFromCalendar(server: DiscordIOServer, calendar: CalendarMonth): MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(calendar.definition.emoji + ' **' + calendar.definition.fullName + '** calendar for the ' + server.name + ' Server\n\n');

        for (let index = 0; index < calendar.days.length; ++index) {
            const day = calendar.days[index];
            const dayPrefix = (index + 1) + ' ' + calendar.definition.abbreviation + ': ';

            for (const event of day) {
                builder.append(dayPrefix + event + '\n');
            }
        }

        return builder;
    }
};
