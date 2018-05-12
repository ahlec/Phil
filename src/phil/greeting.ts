'use strict';

import { Client as DiscordIOClient, Member as DiscordIOMember, User as DiscordIOUser } from 'discord.io';
import { DiscordPromises } from '../promises/discord';
import { BotUtils } from './utils';
import { ServerConfig } from './server-config';
const util = require('util');

function getUser(bot : DiscordIOClient, member : DiscordIOMember) : DiscordIOUser {
    const user = bot.users[member.id];

    if (!user) {
        throw new Error('Unable to retrieve the user for the member who just joined.');
    }

    return user;
}

function makeGreetingMessage(user : DiscordIOUser) : string {
    var message = ':snowflake: Welcome to the server, **<@' + user.id + '>**! :dragon_face:\n\n';
    message += 'Please check out <#' + process.env.WELCOME_RULES_CHANNEL_ID + '>, which has both the couple of rules we ask you to follow for being a part of the server, but also has a startup guide to get you all set up here. It should only take a few minutes, tops.\n\n';
    message += 'When you\'ve finished that, feel free to come back here to introduce yourself to everybody! If you have a Tumblr account but it isn\'t the same as your Discord name, post a link to your blog so we can either recognise you, or so we can go follow you!\n\n';
    message += 'We\'re really happy to have you here, and we hope you\'ll enjoy being here as well!';
    return message;
}

async function onError(bot : DiscordIOClient, serverConfig : ServerConfig, member : DiscordIOMember, err : Error) : Promise<void> {
    console.error(err);

    let displayError = util.inspect(err);
    await DiscordPromises.sendMessage(bot, serverConfig.botControlChannel.id, 'There was an error sending a greeting message for new member ' + member.id + '.');
    await DiscordPromises.sendMessage(bot, serverConfig.botControlChannel.id, displayError);
}

export async function greetNewMember(bot : DiscordIOClient, serverConfig : ServerConfig, member : DiscordIOMember) : Promise<void> {
    try {
        const user = getUser(bot, member);

        if (user.bot) {
            console.log('New user is a bot, skipping greeting.');
            return;
        }

        const welcomeMessage = makeGreetingMessage(user);
        DiscordPromises.sendMessage(bot, process.env.INTRODUCTIONS_CHANNEL_ID, welcomeMessage);
    } catch(err) {
        onError(bot, serverConfig, member, err);
    }
};
