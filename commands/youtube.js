module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
    const youTube = require('youtube-node');

    function searchYoutube(query) {
        return new Promise((resolve, reject) => {
            const youtubeApi = new youTube();
            youtubeApi.setKey(process.env.YOUTUBE_API_KEY);
            youtubeApi.search(query, 1, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    function postQueryResult(bot, channelId, query, result) {
        if (result.items.length === 0) {
            bot.sendMessage({
                to: channelId,
                message: 'There were no results on YouTube for `' + query + '`.'
            });
            return;
        }

        const youtubeLink = 'https://youtu.be/' + result.items[0].id.videoId;
        bot.sendMessage({
            to: channelId,
            message: youtubeLink
        });
    }

    function sendQueryError(bot, channelId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'There was a problem encountered when trying to query YouTube. `' + err + '`'
        });
    }

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'yt' ],
        helpDescription: 'Searches YouTube for something and posts a link to the first video.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const query = commandArgs.join(' ').trim();
            if (query.length === 0) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: 'You must provide some text to tell me what to search for.'
                });
                return;
            }

            searchYoutube(query)
                .then(result => {
                    postQueryResult(bot, channelId, query, result);
                })
                .catch(err => {
                    sendQueryError(bot, channelId, err);
                });
        }
    };
})();