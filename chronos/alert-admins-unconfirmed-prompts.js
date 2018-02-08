'use strict';

const discord = require('../promises/discord');
const serverConfigs = require('../phil/server-configs');
const prompts = require('../phil/prompts');

function getUnconfimedPromptsMessage(counts) {
    if (numUnconfirmedPrompts == 0) {
        return '';
    }

    var numberStrPortion;
    if (numUnconfirmedPrompts == 1) {
        numberStrPortion = 'is **1** unconfirmed prompt';
    } else {
        numberStrPortion = 'are **' + numUnconfirmedPrompts + '** unconfirmed prompts';
    }

    return ':large_blue_diamond: There ' + numberStrPortion + ' in the queue. Please use `' + process.env.COMMAND_PREFIX + 'unconfirmed` to confirm them.';
}

function sendAlertMessage(bot, unconfirmedMessage) {
    if (unconfirmedMessage.length === 0) {
        return;
    }

    return discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, unconfirmedMessage);
}

function processServer(chronosManager, now, bot, db, serverId) {
    return serverConfigs.getFromId(bot, db, serverId)
        .then(serverConfig => {
            return prompts.countUnconfirmedPromptsForServer(db, serverId)
                .then(getUnconfimedPromptsMessage)
                .then()
        });

     db.query('SELECT count(*) FROM prompts WHERE approved_by_admin = E\'0\'')
        .then(results => results.rows[0].count)
        .then(getUnconfimedPromptsMessage)
        .then(unconfirmedMessage => sendAlertMessage(bot, unconfirmedMessage))
        .then(() => true);
}

module.exports = {
    canProcess: function(bot, db, serverId, now) {
        return Promise.resolve({
            ready: true
        });
    },

    process: function(bot, db, serverId, now) {
        var returnValue = Promise.resolve();
        for (let serverId in bot.servers) {
            returnValue = returnValue.then(() => processServer(chronosManager, now, bot, db,serverId));
        }

        return returnValue.then(() => true);
    }
};
