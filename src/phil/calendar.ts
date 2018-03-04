import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from './database';
import { BotUtils } from './utils';

class MonthInfo {
    constructor(public readonly fullName : string,
        public readonly abbreviation : string,
        public readonly emoji : string) {
    }
}

const months = [
    new MonthInfo('January', 'Jan', ':snowman2:'),
    new MonthInfo('February', 'Feb', ':revolving_hearts:'),
    new MonthInfo('March', 'Mar', ':four_leaf_clover:'),
    new MonthInfo('April', 'Apr', ':cloud_rain:'),
    new MonthInfo('May', 'May', ':rose:'),
    new MonthInfo('June', 'June', ':beach:'),
    new MonthInfo('July', 'July', ':sunrise:'),
    new MonthInfo('August', 'Aug', ':sun_with_face:'),
    new MonthInfo('September', 'Sept', ':fallen_leaf:'),
    new MonthInfo('October', 'Oct', ':jack_o_lantern:'),
    new MonthInfo('November', 'Nov', ':turkey:'),
    new MonthInfo('December', 'Dec', ':snowflake:')
];

interface DayEventCollection {
    [index : number] : string[];
    length : number;
    push(eventDisplayStr : string) : void;
}

export class CalendarMonth {
    readonly monthInfo : MonthInfo;
    readonly days: DayEventCollection[] = [];

    private constructor(private readonly month : number) {
        this.monthInfo = months[month - 1];

        for (let day = 0; day < 31; ++day) {
            this.days.push([]);
        }
    }

    static async getForMonth(bot : DiscordIOClient, db : Database, server : DiscordIOServer, month : number) : Promise<CalendarMonth> {
        const calendar = new CalendarMonth(month);
        await calendar.addBirthdaysForMonth(bot, db, server);
        await calendar.addServerEventsForMonth();
        return calendar;
    }

    private addEvent(day : number, eventDisplayStr : string) : void {
        this.days[day - 1].push(eventDisplayStr);
    }

    private async addBirthdaysForMonth(bot : DiscordIOClient, db : Database, server : DiscordIOServer) {
        const results = await db.query('SELECT userid, birthday_day FROM birthdays WHERE birthday_month = $1', [this.month]);

        for (let index = 0; index < results.rowCount; ++index) {
            let userId = results.rows[index].userid;
            let userDisplayName = BotUtils.getUserDisplayName(bot, server.id, userId);
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
