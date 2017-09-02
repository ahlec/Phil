'use strict';

// Retrieve the modules
const assert = require('assert');
const discord = require('discord.io');

// Make sure our environment is ready to operate
require('dotenv').config({ silent: process.env.NODE_ENV === 'production' });
assert.ok(process.env.DISCORD_BOT_TOKEN !== undefined);

// Connect to the bot
const bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

bot.on('ready', function() {
	console.log('Logged in as %s - %s\n', bot.username, bot.id);
});

bot.on('message', function(user, userId, channelId, message, event) {
	if ( message == "PHIL" ) {
		bot.sendMessage({
            to: channelId,
            message: "HELLO WORLD"
		});
	}
});