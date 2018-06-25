import Database from 'database';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { BotUtils } from 'utils';
import { AllMonths, MonthDefinition } from './month-definition';


type DayEventCollection = ReadonlyArray<string[]>;

export default class CalendarMonth {
    public static async getForMonth(bot: DiscordIOClient, db: Database, server: DiscordIOServer, month: number): Promise<CalendarMonth> {
        const calendar = new CalendarMonth(month);
        await calendar.addBirthdaysForMonth(bot, db, server);
        await calendar.addServerEventsForMonth();
        return calendar;
    }

    public readonly definition: MonthDefinition;
    public readonly days: DayEventCollection;

    private constructor(private readonly month: number) {
        this.definition = AllMonths[month - 1];

        const mutableDays: string[][] = [];
        for (let day = 0; day < 31; ++day) {
            mutableDays.push([]);
        }

        this.days = mutableDays;
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
