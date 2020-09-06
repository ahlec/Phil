import Server from '@phil/discord/Server';

import Database from '@phil/database';
import GlobalConfig from '@phil/GlobalConfig';
import { AllMonths, MonthDefinition } from './month-definition';

type DayEventCollection = ReadonlyArray<string[]>;

class CalendarMonth {
  public static async getForMonth(
    server: Server,
    database: Database,
    month: number
  ): Promise<CalendarMonth> {
    const calendar = new CalendarMonth(month);
    await calendar.addBirthdaysForMonth(server, database);
    calendar.addServerEventsForMonth(server);
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

  private async addBirthdaysForMonth(
    server: Server,
    db: Database
  ): Promise<void> {
    const results = await db.query<{ userid: string; birthday_day: number }>(
      'SELECT userid, birthday_day FROM birthdays WHERE birthday_month = $1',
      [this.month]
    );

    await Promise.all(
      results.rows.map(
        async (row): Promise<void> => {
          const member = await server.getMember(row.userid);
          if (!member) {
            return;
          }

          this.addEvent(
            row.birthday_day,
            '**' + member.displayName + "**'s birthday."
          );
        }
      )
    );
  }

  private addServerEventsForMonth(server: Server): void {
    if (server.id === GlobalConfig.hijackServerId) {
      this.addEvent(3, 'Hijack Booty Day.');
    }
  }
}

export default CalendarMonth;
