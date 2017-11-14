'use strict';

const assert = require('assert');
const util = require('util');

module.exports = function(event, bot) {
    assert(event);
    assert(event.d);
    assert(event.t === 'MESSAGE_CREATE');

    const mentions = [];
    for (let mention of event.d.mentions) {
        mentions.push({
            userId: mention.id,
            user: mention.username,
            userDiscriminator: mention.discriminator // ie, #3787
        });
    }

    return {
        id: event.d.id,
        channelId: event.d.channel_id,
        user: event.d.author.username,
        userId: event.d.author.id,
        content: event.d.content,
        isDirectMessage: ( event.d.channel_id in bot.directMessages ? true : false ),
        mentions: mentions
    };
};
