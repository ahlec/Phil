import { IPublicMessage } from 'phil';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import UserTimezone from '../phil/timezones/user-timezone';
import BotUtils from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

import chronoNode = require('chrono-node');
import moment = require('moment-timezone');

function formatTimeToString(time : moment.Moment) : string {
    return time.format('HH:mm (h:mm A)');
}

export default class UtcCommand implements ICommand {
    public readonly name = 'utc';
    public readonly aliases = [ 'gmt' ];
    public readonly feature = Features.TimezoneProcessing;

    public readonly helpGroup = HelpGroup.Time;
    public readonly helpDescription = 'Converts a time from your local timezone to UTC.';

    public readonly versionAdded = 10;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const inputTime = this.getTimeFromCommandArgs(commandArgs);
        if (!inputTime) {
            throw new Error('You must provide a time to this command so that I know what to convert to UTC. You can try using `' + message.serverConfig.commandPrefix + 'utc 5pm` or `' + message.serverConfig.commandPrefix + 'utc tomorrow at 11:30` to try it out.');
        }

        const timezone = await UserTimezone.getForUser(phil.db, message.userId);
        if (!timezone || !timezone.hasProvided) {
            throw new Error('In order to use this command, you must first provide your timezone to me so I know how to convert your local time. You can use `' + message.serverConfig.commandPrefix + 'timezone` to start that process.');
        }

        const reply = this.createReply(inputTime, timezone);
        return DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: 0x7A378B,
            description: reply,
            footer: {
                text: 'Converted from user\'s local timezone to UTC. If the time provided is incorrect, your timezone might need to be updated. Use ' + message.serverConfig.commandPrefix + 'timezone to change/set.'
            },
            title: 'Timezone Conversion'
        });
    }

    private getTimeFromCommandArgs(commandArgs: ReadonlyArray<string>): chronoNode.ParsedComponent {
        const content = commandArgs.join(' ').trim();
        if (content.length === 0) {
            return null;
        }

        const dateTimes = chronoNode.parse(content);
        if (!dateTimes || dateTimes.length === 0) {
            return null;
        }

        if (!dateTimes[0].start.isCertain('hour')) {
            return null;
        }

        return dateTimes[0].start;
    }

    private createReply(inputTime: chronoNode.ParsedComponent, timezone: UserTimezone): string {
        const localTime = inputTime.clone().moment();
        let reply = formatTimeToString(localTime) + ' local time is **';

        const timezoneOffset = moment().tz(timezone.timezoneName).utcOffset();
        inputTime.assign('timezoneOffset', timezoneOffset);
        const utcTime = inputTime.moment().tz('Etc/UTC');
        reply += formatTimeToString(utcTime);
        reply += '** UTC.';

        return reply;
    }
};
