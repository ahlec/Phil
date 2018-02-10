'use strict';

const discord = require('../promises/discord');
const assert = require('assert');
const features = require('../phil/features');
const helpGroups = require('../phil/help-groups');
const prompts = require('../phil/prompts');

const RANKING_EMOJI = {
    1: ':first_place:',
    2: ':second_place:',
    3: ':third_place:'
};

const RANKING_TEXT = {
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

function createLeaderboardMessageEntry(ranking, entry) {
    var emoji = RANKING_EMOJI[ranking];
    var rankText = RANKING_TEXT[ranking];
    assert(rankText);

    var message = (emoji ? emoji : process.env.CUSTOM_EMOJI_TRANSPARENT);
    message += ' ';
    message += rankText;
    message += ': **';
    message += entry.displayName;
    message += '**';

    if (!entry.isStillInServer) {
        message += ' (no longer in server)';
    }

    message += ' has submitted **'
    message += entry.score;
    message += '** prompt';
    if (entry.score !== 1) {
        message += 's';
    }
    message += '\n';

    return message;
}

function createLeaderboardMessage(leaderboard) {
    var leaderboardMessage = '';

    for (let index = 0; index < leaderboard.length; ++index) {
        if (index > 0) {
            leaderboardMessage += '\n';
        }

        leaderboardMessage += createLeaderboardMessageEntry(index + 1, leaderboard[index]);
    }

    return leaderboardMessage;
}

function sendLeaderboardToChat(bot, channelId, leaderboardMessage) {
    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: 'Hijack Prompt of the Day Leaderboard',
        description: leaderboardMessage,
        footer: {
            text: 'You can increase your score by submitting prompts! Use ' + process.env.COMMAND_PREFIX + 'suggest in a direct message with me!'
        }
    });
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Display the leaderboard for prompt submissions on the server, which shows who is in the lead for suggesting discussion prompts.',
    versionAdded: 11,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return features.ensureFeatureIsEnabled(features.Features.Prompts, db)
            .then(() => prompts.getLeaderboard(bot, db, message.server))
            .then(createLeaderboardMessage)
            .then(leaderboardMessage => sendLeaderboardToChat(bot, message.channelId, leaderboardMessage));
    }
};
