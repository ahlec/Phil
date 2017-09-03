'use strict';

// Retrieve the modules
const assert = require('assert');
const discord = require('discord.io');
const http = require('http');
const express = require('express');
const botCommands = require('./commands');

// Make sure our environment is ready to operate
require('dotenv').config({ silent: process.env.NODE_ENV === 'production' });
assert.ok(process.env.DISCORD_BOT_TOKEN !== undefined);
assert.ok(process.env.PORT !== undefined);
assert.ok(process.env.COMMAND_PREFIX !== undefined);
assert.ok(process.env.COMMAND_PREFIX.toLowerCase() === process.env.COMMAND_PREFIX); // Prefix must be lowercase!!

// Connect to the bot
const bot = new discord.Client( { token: process.env.DISCORD_BOT_TOKEN, autorun: true } );

bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
});

bot.on('message', function(user, userId, channelId, message, event) {
    if (message === undefined || message === "") {
	    return;
    }

	// Process the incoming data
    const isDirectMessage = ( channelId in bot.directMessages ? true : false );
	const messageTokens = message.split(' ');
	const words = message.split(' ');
	const isPrompt = (words.length > 0 && words[0].toLowerCase().startsWith(process.env.COMMAND_PREFIX));
	const command = (isPrompt ? words[0].substr(process.env.COMMAND_PREFIX.length) : undefined);

    // Handle the message
	if (isPrompt) {
        console.log('user \'%s\' (%s) used command \'%s\'', user, userId, command);
		if (botCommands[command]) {
			if (isDirectMessage) {
				bot.sendMessage({
					to: channelId,
					message: 'TODO!!'
				});
			} else {
				botCommands[command].processPublicMessage(bot, user, userId, channelId, message);
			}
		} else {
			bot.sendMessage({
				to: channelId,
				message: 'INVALID COMMAND!'
			});
		}
	}
});

// Set up the web portal
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/assets'));

// Run web portal
app.get('/', (request, response) => {
	response.render('index');
});

app.listen(process.env.PORT, () => {
	console.log('Web portal is running on port ' + process.env.PORT);
});

// Ping the server every 15 minutes so that the Heroku dynos won't fall asleepe
setInterval(() => {
	http.get(process.env.PUBLIC_APP_URL);
}, 1000 * 60 * 15);