import { Client as DiscordIOClient, Member as DiscordIOMember, User as DiscordIOUser } from 'discord.io';
import Database from './database';
import Features from './features/all-features';
import Phil from './phil';
import { DiscordPromises } from './promises/discord';
import ServerConfig from './server-config';
import { BotUtils } from './utils';
const util = require('util');

function getUser(bot: DiscordIOClient, member: DiscordIOMember): DiscordIOUser {
    const user = bot.users[member.id];

    if (!user) {
        throw new Error('Unable to retrieve the user for the member who just joined.');
    }

    return user;
}

export function makeGreetingMessage(serverConfig: ServerConfig, user: DiscordIOUser): string {
    const displayName = BotUtils.getUserDisplayName(user, serverConfig.server);
    return serverConfig.welcomeMessage.replace(/\{user\}/g, '<@' + user.id + '>')
        .replace(/\{name\}/g, displayName);
}

async function onError(bot: DiscordIOClient, serverConfig: ServerConfig, member: DiscordIOMember, err: Error): Promise<void> {
    console.error(err);

    const displayError = util.inspect(err);
    await DiscordPromises.sendMessage(bot, serverConfig.botControlChannel.id, 'There was an error sending a greeting message for new member ' + member.id + '.');
    await DiscordPromises.sendMessage(bot, serverConfig.botControlChannel.id, displayError);
}

async function shouldWelcomeMember(db: Database, serverConfig: ServerConfig, user: DiscordIOUser): Promise<boolean> {
    if (!user || user.bot) {
        return false;
    }

    if (!serverConfig.welcomeMessage || serverConfig.welcomeMessage.length === 0) {
        return false;
    }

    return await Features.WelcomeMessage.getIsEnabled(db, serverConfig.server.id);
}

export async function greetNewMember(phil: Phil, serverConfig: ServerConfig, member: DiscordIOMember) {
    try {
        const user = getUser(phil.bot, member);
        const shouldWelcome = await shouldWelcomeMember(phil.db, serverConfig, user);
        if (!shouldWelcome) {
            return;
        }

        const welcomeMessage = makeGreetingMessage(serverConfig, user);
        DiscordPromises.sendMessage(phil.bot, serverConfig.introductionsChannel.id, welcomeMessage);
    } catch(err) {
        onError(phil.bot, serverConfig, member, err);
    }
};
