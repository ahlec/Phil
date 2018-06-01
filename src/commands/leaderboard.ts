'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { LeaderboardEntry, Leaderboard } from '../phil/prompts/leaderboard';

const RANKING_EMOJI : { [rank : number] : string } = {
    1: ':first_place:',
    2: ':second_place:',
    3: ':third_place:'
};

const RANKING_TEXT : { [rank : number] : string } = {
    1: '1ˢᵗ',
    2: '2ⁿᵈ',
    3: '3ʳᵈ',
    4: '4ᵗʰ',
    5: '5ᵗʰ',
    6: '6ᵗʰ',
    7: '7ᵗʰ',
    8: '8ᵗʰ',
    9: '9ᵗʰ',
    10: '10ᵗʰ'
};

function createLeaderboardMessageEntry(ranking : number, entry : LeaderboardEntry) : string {
    var emoji = RANKING_EMOJI[ranking];
    var rankText = RANKING_TEXT[ranking];

    var message = (emoji || process.env.CUSTOM_EMOJI_TRANSPARENT);
    message += ' ';
    message += rankText;
    message += ': **';
    message += entry.displayName;
    message += '**';

    if (!entry.isStillInServer) {
        message += ' (no longer in server)';
    }

    message += ' has submitted **';
    message += entry.score;
    message += '** prompt';
    if (entry.score !== 1) {
        message += 's';
    }
    message += '\n';

    return message;
}

function createLeaderboardMessage(leaderboard : Leaderboard) : string {
    var leaderboardMessage = '';

    for (let index = 0; index < leaderboard.entries.length; ++index) {
        if (index > 0) {
            leaderboardMessage += '\n';
        }

        leaderboardMessage += createLeaderboardMessageEntry(index + 1, leaderboard.entries[index]);
    }

    return leaderboardMessage;
}

export class LeaderboardCommand implements Command {
    readonly name = 'leaderboard';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Display the leaderboard for prompt submissions on the server, which shows who is in the lead for suggesting discussion prompts.';

    readonly versionAdded = 11;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const leaderboard = await Leaderboard.getLeaderboard(phil.bot, phil.db, message.server);
        const reply = createLeaderboardMessage(leaderboard);

        DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: 0xB0E0E6,
            title: 'Hijack Prompt of the Day Leaderboard',
            description: reply,
            footer: {
                text: 'You can increase your score by submitting prompts! Use ' + message.serverConfig.commandPrefix + 'suggest in a direct message with me!'
            }
        });
    }
};
