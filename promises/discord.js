module.exports = (function() {
    'use strict';

    function _performSendMessagePromise(resolve, reject, bot, channelId, message) {
        bot.sendMessage({
            to: channelId,
            message: message
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        })
    }

    return {
        PUBLIC_CHANNEL_CHARACTER_LIMIT: 2000,

        sendMessage: function(bot, channelId, message) {
            if (typeof(bot) !== 'object') {
                return Promise.reject('sendMessage was not provided a valid bot.');
            }

            if (typeof(channelId) !== 'string') {
                return Promise.reject('sendMessage was not provided a channel');
            }

            if (typeof(message) !== 'string') {
                return Promise.reject('sendMessage was not provided a message');
            }

            return new Promise((resolve, reject) => _performSendMessagePromise(resolve, reject, bot, channelId, message));
        }
    };
})();