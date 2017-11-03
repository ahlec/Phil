'use strict';

const assert = require('assert');
const util = require('util');

module.exports = function(event, bot) {
    assert(event);
    assert(event.d);
    assert(event.t === 'MESSAGE_CREATE');

    return {
        id: event.d.id,
        channelId: event.d.channel_id,
        user: event.d.author.username,
        userId: event.d.author.id,
        content: event.d.content,
        isDirectMessage: ( event.d.channel_id in bot.directMessages ? true : false ),
    };
};