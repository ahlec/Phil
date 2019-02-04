import { Moment } from 'moment';
import Database from '../database';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import { GROUP_PRONOUNS } from '../pronouns/definitions';
import { Pronoun } from '../pronouns/pronoun';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

interface HappyBirthdayInfo {
  readonly names: ReadonlyArray<string>;
  readonly pronoun: Pronoun;
}

const HANDLE = 'happy-birthday';
export default class HappyBirthdayChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig, now: Moment) {
    const userIds = await this.getBirthdayUserIds(phil.db, serverConfig, now);
    const info = this.getInfo(phil, serverConfig, userIds);
    const birthdayWish = this.createBirthdayWish(info);
    if (birthdayWish === '') {
      return;
    }

    DiscordPromises.sendMessage(
      phil.bot,
      serverConfig.newsChannel.id,
      birthdayWish
    );
  }

  private async getBirthdayUserIds(
    db: Database,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<string[]> {
    const day = now.date();
    const month = now.month() + 1;

    const results = await db.query(
      'SELECT userid FROM birthdays WHERE birthday_day = $1 AND birthday_month = $2',
      [day, month]
    );
    const userIds = [];
    for (let index = 0; index < results.rowCount; ++index) {
      const userId = results.rows[index].userid;
      const member = serverConfig.server.members[userId];
      if (!member) {
        continue;
      }

      userIds.push(userId);
    }

    return userIds;
  }

  private getInfo(
    phil: Phil,
    serverConfig: ServerConfig,
    userIds: string[]
  ): HappyBirthdayInfo {
    const names = [];
    for (const userId of userIds) {
      const user = phil.bot.users[userId];
      const userDisplayName = BotUtils.getUserDisplayName(
        user,
        serverConfig.server
      );
      if (!userDisplayName) {
        continue;
      }

      names.push(userDisplayName);
    }

    let pronoun = GROUP_PRONOUNS;
    if (userIds.length === 1) {
      const member = serverConfig.server.members[userIds[0]];
      pronoun = serverConfig.getPronounsForMember(member);
    }

    return {
      names,
      pronoun,
    };
  }

  private createBirthdayWish(info: HappyBirthdayInfo): string {
    if (info.names.length === 0) {
      return '';
    }

    let message = ':birthday: Today is ';
    let separator = ', ';
    if (info.names.length === 2) {
      message += 'both ';
      separator = '';
    }

    for (let index = 0; index < info.names.length; ++index) {
      if (index > 0) {
        message += separator;

        if (index === info.names.length - 1) {
          message += ' and ';
        } else {
          message += ' ';
        }
      }
      message += '**' + info.names[index] + '**';
    }

    message += "'s birthday! Wish ";

    const pronounInCase = info.pronoun.object.toLowerCase();
    message += pronounInCase;
    message += ' a happy birthday when you see ';
    message += pronounInCase;
    message += '!';

    return message;
  }
}
