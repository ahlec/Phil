'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { Server as DiscordIOServer } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { CalendarMonth } from '../phil/calendar';
import { MessageBuilder } from '../phil/message-builder';
import { ServerConfig } from '../phil/server-config';

const chronoNode = require('chrono-node');

export class CalendarCommand implements Command {
    readonly name = 'calendar';
    readonly aliases : string[] = [];
    readonly feature = Features.Calendar;

    readonly helpGroup = HelpGroup.General;
    readonly helpDescription = 'Has Phil display the calendar of server events for the month in question.';

    readonly versionAdded = 6;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const month = this.determineMonth(message.serverConfig, commandArgs);
        const calendar = await CalendarMonth.getForMonth(phil.bot, phil.db, message.server, month);
        const builder = this.composeMessageFromCalendar(message.server, calendar);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, builder);
    }

    private determineMonth(serverConfig : ServerConfig, commandArgs : string[]) : number {
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
