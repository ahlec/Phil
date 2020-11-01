import { Moment } from 'moment';

import Member from '@phil/discord/Member';
import Server from '@phil/discord/Server';

import Database from '@phil/database';
import Features from '@phil/features/all-features';
import Phil from '@phil/phil';
import { GROUP_PRONOUNS } from '@phil/pronouns/definitions';
import { Pronoun } from '@phil/pronouns/pronoun';
import ServerConfig from '@phil/server-config';
import { isNotNull } from '@phil/utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

interface HappyBirthdayInfo {
  readonly names: ReadonlyArray<string>;
  readonly pronoun: Pronoun;
}

const HANDLE = 'happy-birthday';
export default class HappyBirthdayChrono extends Logger implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Calendar;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    phil: Phil,
    server: Server,
    serverConfig: ServerConfig,
    now: Moment
  ): Promise<void> {
    const members = await this.getBirthdayMembers(phil.db, server, now);
    const info = await this.getInfo(serverConfig, members);
    const birthdayWish = this.createBirthdayWish(info);
    if (birthdayWish === '') {
      return;
    }

    await serverConfig.newsChannel.sendMessage({
      text: birthdayWish,
      type: 'plain',
    });
  }

  private async getBirthdayMembers(
    db: Database,
    server: Server,
    now: Moment
  ): Promise<readonly Member[]> {
    const day = now.date();
    const month = now.month() + 1;

    const results = await db.query<{ userid: string }>(
      'SELECT userid FROM birthdays WHERE birthday_day = $1 AND birthday_month = $2',
      [day, month]
    );

    const members = await Promise.all(
      results.rows.map(
        async ({ userid }): Promise<Member | null> => server.getMember(userid)
      )
    );

    return members.filter(isNotNull);
  }

  private async getInfo(
    serverConfig: ServerConfig,
    members: readonly Member[]
  ): Promise<HappyBirthdayInfo> {
    const names = members.map((member): string => member.displayName);

    let pronoun = GROUP_PRONOUNS;
    if (members.length === 1) {
      pronoun = await serverConfig.getPronounsForMember(members[0].user.id);
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
