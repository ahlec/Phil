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
                resolve(response.id);
            }
        });
    }

    function _performSendEmbedMessagePromise(resolve, reject, bot, channelId, embedData) {
        bot.sendMessage({
            to: channelId,
            embed: embedData
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response.id);
            }
        });
    }

    function _performEditMessagePromise(resolve, reject, bot, channelId, messageId, text) {
        bot.editMessage({
            channelID: channelId,
            messageID: messageId,
            message: text
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    }

    function _performDeleteMessagePromise(resolve, reject, bot, channelId, messageId) {
        bot.deleteMessage({
            channelID: channelId,
            messageID: messageId
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    }

    function _performDeleteRolePromise(resolve, reject, bot, serverId, roleId) {
        bot.deleteRole({
            serverID: serverId,
            roleID: roleId
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    }

    function _performPinMessagePromise(resolve, reject, bot, channelId, messageId) {
        bot.pinMessage({
            channelID: channelId,
            messageID: messageId
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
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
        },

        sendEmbedMessage: function(bot, channelId, embedData) {
            if (typeof(bot) !== 'object') {
                return Promise.reject('sendEmbedMessage was not provided a valid bot.');
            }

            if (typeof(channelId) !== 'string') {
                return Promise.reject('sendEmbedMessage was not provided a channel');
            }

            if (typeof(embedData) !== 'object') {
                return Promise.reject('sendEmbedMessage was not provided embedData');
            }

            return new Promise((resolve, reject) => _performSendEmbedMessagePromise(resolve, reject, bot, channelId, embedData));
        },

        editMessage: function(bot, channelId, messageId, text) {
            if (typeof(bot) !== 'object') {
                return Promise.reject('editMessage was not provided a valid bot.');
            }

            if (typeof(channelId) !== 'string') {
                return Promise.reject('editMessage was not provided a channel');
            }

            if (typeof(messageId) !== 'string') {
                return Promise.reject('editMessage was not provided a message id')
            }

            if (typeof(text) !== 'string') {
                return Promise.reject('editMessage was not provided text');
            }

            return new Promise((resolve, reject) => _performEditMessagePromise(resolve, reject, bot, channelId, messageId, text));
        },

        deleteMessage: function(bot, channelId, messageId) {
            if (typeof(bot) !== 'object') {
                return Promise.reject('deleteMessage was not provided a valid bot.');
            }

            if (typeof(channelId) !== 'string') {
                return Promise.reject('deleteMessage was not provided a channel');
            }

            if (typeof(messageId) !== 'string') {
                return Promise.reject('deleteMessage was not provided a message');
            }

            return new Promise((resolve, reject) => _performDeleteMessagePromise(resolve, reject, bot, channelId, messageId));
        },

        deleteRole: function(bot, serverId, roleId) {
            if (typeof(bot) !== 'object') {
                return Promise.reject('deleteRole was not provided a valid bot.');
            }

            if (typeof(serverId) !== 'string') {
                return Promise.reject('deleteRole was not provided a server');
            }

            if (typeof(roleId) !== 'string') {
                return Promise.reject('deleteRole was not provided a role');
            }

            return new Promise((resolve, reject) => _performDeleteRolePromise(resolve, reject, bot, serverId, roleId));
        },

        pinMessage: function(bot, channelId, messageId) {
            return new Promise((resolve, reject) => _performPinMessagePromise(resolve, reject, bot, channelId, messageId));
        }
    };
})();
