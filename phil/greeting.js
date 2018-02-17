'use strict';

const discord = require('../promises/discord');
const util = require('util');

function getUser(bot, member) {
    const user = bot.users[member.id];

    if (!user) {
        return Promise.reject('Unable to retrieve the user for the member who just joined.');
    }

    return user;
}

function makeGreetingMessage(user) {
    var message = ':snowflake: Welcome to the server, **<@' + user.id + '>**! :dragon_face:\n\n';
    message += 'Please check out <#' + process.env.WELCOME_RULES_CHANNEL_ID + '>, which has both the couple of rules we ask you to follow for being a part of the server, but also has a startup guide to get you all set up here. It should only take a few minutes, tops.\n\n';
    message += 'When you\'ve finished that, feel free to come back here to introduce yourself to everybody! If you have a Tumblr account but it isn\'t the same as your Discord name, post a link to your blog so we can either recognise you, or so we can go follow you!\n\n';
    message += 'We\'re really happy to have you here, and we hope you\'ll enjoy being here as well!';
    return message;
}

function onlySendGreetingIfNotABot(bot, member, user) {
    if (user.bot) {
        console.log('New user is a bot, skipping greeting.');
        return;
    }

    return Promise.resolve(user)
        .then(makeGreetingMessage)
        .then(greeting => discord.sendMessage(bot, process.env.INTRODUCTIONS_CHANNEL_ID, greeting));
}

function onError(bot, member, err) {
    console.error(err);

    if (typeof(err) !== 'string') {
        err = util.inspect(err);
    }

    discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, 'There was an error sending a greeting message for new member ' + member.id + '.')
        .then(() => discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, err));
}

module.exports = function(bot, member) {
    return Promise.resolve()
        .then(() => getUser(bot, member))
        .then(user => onlySendGreetingIfNotABot(bot, member, user))
        .catch(err => onError(bot, member, err));
};
