module.exports = (function() {
    'use strict';

    return {
        name: 'booty day',
        hourUtc: 7, // 2am EST, 11pm PST

        canProcess: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                if (now.getDate() === 3) {
                    resolve({
                        ready: true
                    });
                } else {
                    resolve({
                        ready: false
                    });
                }
            });
        },

        process: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                bot.sendMessage({
                    to: process.env.NEWS_CHANNEL_ID,
                    message: ':peek: It\'s booty day! Post your Hijack booties!'
                });
                resolve(true);
            });
        }
    };
})();