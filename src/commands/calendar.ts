'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { CalendarMonth } from '../phil/calendar';
import { MessageBuilder } from '../phil/message-builder';

const chronoNode = require('chrono-node');

export class CalendarCommand implements Command {
    readonly name = 'calendar';
    readonly aliases : string[] = [];
    readonly feature = Features.Calendar;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Has Phil display the calendar of server events for the month in question.';

    readonly versionAdded = 6;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const month = this.determineMonth(commandArgs);
        const calendar = await CalendarMonth.getForMonth(bot, db, message.server, month);
        const builder = this.composeMessageFromCalendar(message.server, calendar);
        return DiscordPromises.sendMessageBuilder(bot, message.channelId, builder);
    }

    private determineMonth(commandArgs : string[]) : number {
        const input = commandArgs.join(' ').trim();
        if (input === '') {
            const now = new Date();
            return now.getUTCMonth() + 1;
        }

        const inputDate = chronoNode.parseDate(input);
        if (inputDate === null) {
            throw new Error('I couldn\'t understand what month you were trying to get the calendar for. Please try requesting `' + process.env.COMMAND_PREFIX + 'calendar` or `' + process.env.COMMAND_PREFIX + 'calendar december` to target a month that isn\'t this month.');
        }

        return inputDate.getUTCMonth() + 1;
    }

    private composeMessageFromCalendar(server : DiscordIOServer, calendar : CalendarMonth) : MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(calendar.monthInfo.emoji + ' **' + calendar.monthInfo.fullName + '** calendar for the ' + server.name + ' Server\n\n');

        for (let index = 0; index < calendar.days.length; ++index) {
            let day = calendar.days[index];
            const dayPrefix = (index + 1) + ' ' + calendar.monthInfo.abbreviation + ': ';

            for (let messageIndex = 0; messageIndex < day.length; ++messageIndex) {
                builder.append(dayPrefix + day[messageIndex] + '\n');
            }
        }

        return builder;
    }
};
