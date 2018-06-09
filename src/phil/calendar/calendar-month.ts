import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import Database from '../database';
import { BotUtils } from '../utils';
import { AllMonths, MonthDefinition } from './month-definition';

interface IDayEventCollection {
    [index: number]: string[];
    length: number;
    push(eventDisplayStr: string): void;
}

export default class CalendarMonth {
    public static async getForMonth(bot: DiscordIOClient, db: Database, server: DiscordIOServer, month: number): Promise<CalendarMonth> {
        const calendar = new CalendarMonth(month);
        await calendar.addBirthdaysForMonth(bot, db, server);
        await calendar.addServerEventsForMonth();
        return calendar;
    }

    public readonly definition: MonthDefinition;
    public readonly days: IDayEventCollection[] = [];

    private constructor(private readonly month: number) {
        this.definition = AllMonths[month - 1];

        for (let day = 0; day < 31; ++day) {
            this.days.push([]);
        }
    }

    private addEvent(day: number, eventDisplayStr: string): void {
        this.days[day - 1].push(eventDisplayStr);
    }

    private async addBirthdaysForMonth(bot: DiscordIOClient, db: Database, server: DiscordIOServer) {
        const results = await db.query('SELECT userid, birthday_day FROM birthdays WHERE birthday_month = $1', [this.month]);

        for (let index = 0; index < results.rowCount; ++index) {
            const userId = results.rows[index].userid;
            const user = bot.users[userId];
            const userDisplayName = BotUtils.getUserDisplayName(user, server);
            if (!userDisplayName) {
                continue;
            }

            const day = results.rows[index].birthday_day;
            this.addEvent(day, '**' + userDisplayName + '**\'s birthday.');
        }
    }

    private async addServerEventsForMonth() {
        this.addEvent(3, 'Hijack Booty Day.');
    }
}
