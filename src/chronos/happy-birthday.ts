'use strict';

import { Chrono } from './@types';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { BotUtils, Pronoun, PronounCase } from '../phil/utils';

interface HappyBirthdayInfo {
    readonly names : string[];
    readonly pronoun : Pronoun;
}

export class HappyBirthdayChrono implements Chrono {
    readonly handle = 'happy-birthday';

    async process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) {
        const userIds = await this.getBirthdayUserIds(db, now);
        const info = this.getInfo(bot, server, userIds);
        const birthdayWish = this.createBirthdayWish(info);
        if (birthdayWish === '') {
            return;
        }

        DiscordPromises.sendMessage(bot, process.env.NEWS_CHANNEL_ID, birthdayWish);
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

    private getInfo(bot : DiscordIOClient, server : DiscordIOServer, userIds : string[]) : HappyBirthdayInfo {
        var names = [];
        for (let index = 0; index < userIds.length; ++index) {
            const userId = userIds[index];
            const userDisplayName = BotUtils.getUserDisplayName(bot, server.id, userId);
            if (!userDisplayName) {
                continue;
            }

            names.push(userDisplayName);
        }

        var pronoun = Pronoun.They;
        if (userIds.length === 1) {
            pronoun = BotUtils.getPronounForUser(bot, server, userIds[0]);
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

        const pronounInCase = BotUtils.getPronounOfCase(info.pronoun, PronounCase.Him).toLowerCase();
        message += pronounInCase;
        message += ' a happy birthday when you see ';
        message += pronounInCase;
        message += '!';

        return message;
    }
}
