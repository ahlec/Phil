'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { IServerConfig, IPronoun } from 'phil';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { BotUtils } from '../phil/utils';
import { GROUP_PRONOUNS } from '../phil/pronouns';

interface HappyBirthdayInfo {
    readonly names : string[];
    readonly pronoun : IPronoun;
}

export class HappyBirthdayChrono implements Chrono {
    readonly handle = 'happy-birthday';

    async process(phil : Phil, serverConfig : IServerConfig, now : Date) {
        const userIds = await this.getBirthdayUserIds(phil.db, now);
        const info = this.getInfo(phil, serverConfig, userIds);
        const birthdayWish = this.createBirthdayWish(info);
        if (birthdayWish === '') {
            return;
        }

        DiscordPromises.sendMessage(phil.bot, serverConfig.newsChannel.id, birthdayWish);
    }

    private async getBirthdayUserIds(db : Database, now : Date) : Promise<string[]> {
        const day = now.getUTCDate();
        const month = now.getUTCMonth() + 1;

        const results = await db.query('SELECT userid FROM birthdays WHERE birthday_day = $1 AND birthday_month = $2', [day, month]);
        var userIds = [];
        for (let index = 0; index < results.rowCount; ++index) {
            userIds.push(results.rows[index].userid);
        }

        return userIds;
    }

    private getInfo(phil : Phil, serverConfig : IServerConfig, userIds : string[]) : HappyBirthdayInfo {
        var names = [];
        for (let index = 0; index < userIds.length; ++index) {
            const userId = userIds[index];
            const user = phil.bot.users[userId];
            const userDisplayName = BotUtils.getUserDisplayName(user, serverConfig.server);
            if (!userDisplayName) {
                continue;
            }

            names.push(userDisplayName);
        }

        var pronoun = GROUP_PRONOUNS;
        if (userIds.length === 1) {
            const member = serverConfig.server.members[userIds[0]];
            pronoun = serverConfig.getPronounsForMember(member);
        }

        return {
            names: names,
            pronoun: pronoun
        };
    }

    private createBirthdayWish(info : HappyBirthdayInfo) : string {
        if (info.names.length === 0) {
            return '';
        }

        var message = ':birthday: Today is ';
        var separator = ', ';
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

        message += '\'s birthday! Wish ';

        const pronounInCase = info.pronoun.object.toLowerCase();
        message += pronounInCase;
        message += ' a happy birthday when you see ';
        message += pronounInCase;
        message += '!';

        return message;
    }
}
