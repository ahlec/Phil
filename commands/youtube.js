module.exports = (function() {
    'use strict';

    const youTube = require('youtube-node');

    function _getQuery(commandArgs) {
        return commandArgs.join(' ').trim();
    }

    function _ensureQueryProvided(query) {
        if (query.length === 0) {
            return Promise.reject('You must provide some text to tell me what to search for.');
        }

        return query;
    }

    function _performYouTubeSearch(query, resolve, reject) {
        const youtubeApi = new youTube();
        youtubeApi.setKey(process.env.YOUTUBE_API_KEY);
        youtubeApi.search(query, 1, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    }

    function _searchYouTube(query) {
        return new Promise((resolve, reject) => _performYouTubeSearch(query, resolve, reject));
    }

    function _getYouTubeLink(result) {
        if (result.items.length === 0) {
            return Promise.reject('There were no results on YouTube for you search.');
        }

        return 'https://youtu.be/' + result.items[0].id.videoId;
    }

    function _postYouTubeLink(bot, channelId, link) {
        bot.sendMessage({
            to: channelId,
            message: link
        });
    }

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'yt' ],
        helpDescription: 'Searches YouTube for something and posts a link to the first video.',

        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return Promise.resolve()
                .then(() => _getQuery(commandArgs))
                .then(query => _ensureQueryProvided(query))
                .then(_searchYouTube)
                .then(_getYouTubeLink)
                .then(link => _postYouTubeLink(bot, channelId, link));
        }
    };
})();