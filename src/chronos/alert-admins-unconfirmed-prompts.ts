'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-config';
import { BotUtils } from '../phil/utils';
import { UnconfirmedPromptTally } from '../phil/prompts/unconfirmed-prompt-tally';

export class AlertAdminsUnconfirmedPromptsChrono implements Chrono {
    readonly handle = 'alert-admins-unconfirmed-prompts';

    async process(phil : Phil, serverConfig : ServerConfig, now : Date) {
        const unconfirmedTally = await UnconfirmedPromptTally.collectForServer(phil.db, serverConfig.server.id);
        const reply = this.getUnconfimedPromptsMessage(serverConfig, unconfirmedTally).trim();
        if (reply.length === 0) {
            return;
        }

        DiscordPromises.sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
            color: 0xB0E0E6,
            title: ':ballot_box: Unconfirmed Prompt Submissions',
            description: reply
        });
    }

    private getUnconfimedPromptsMessage(serverConfig : ServerConfig, unconfirmedTallies : UnconfirmedPromptTally[]) : string {
        if (!unconfirmedTallies || unconfirmedTallies.length === 0) {
            return '';
        }

        var message = '';
        for (let tally of unconfirmedTallies) {
            message += this.getMessageForTally(tally) + '\n';
        }

        message += '\n';

        var randomTally = BotUtils.getRandomArrayEntry(unconfirmedTallies);
        message += 'You can say `' + serverConfig.commandPrefix + 'unconfirmed ' + randomTally.bucketHandle + '` to start the confirmation process.';
        return message;
    }

    private getMessageForTally(tally : UnconfirmedPromptTally) : string {
        if (tally.numUnconfirmed === 1) {
            return 'There is **1** unconfirmed prompt waiting in bucket `' + tally.bucketHandle + '`.';
        }

        return 'There are **' + tally.numUnconfirmed + '** prompts waiting in bucket `' + tally.bucketHandle + '`.';
    }
}
