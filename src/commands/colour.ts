'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';

const decemberLinks = [
    'http://www.december.com/html/spec/color0.html',
    'http://www.december.com/html/spec/color1.html',
    'http://www.december.com/html/spec/color2.html',
    'http://www.december.com/html/spec/color3.html',
    'http://www.december.com/html/spec/color4.html',
];

const compliments = [
    'That\'s a really pretty colour, too.',
    'It looks excellent on you.',
    'That\'s a phenomenal choice.',
    'That\'s sure to stand out and turn some heads.',
    'I really love that shade, by the way.',
    'It\'s absolutely beautiful.'
];

export class ColourCommand implements Command {
    readonly name = 'colour';
    readonly aliases = ['color'];
    readonly feature = Features.Colour;

    readonly helpGroup = HelpGroup.Roles;
    readonly helpDescription = 'Asks Phil to change your username colour to a hex code of your choosing.';

    readonly versionAdded = 3;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const hexColor = this.getHexColorFromCommandArgs(commandArgs);
        const colorRole = await this.getRoleFromHexColor(phil, message.server, hexColor);

        await this.removeColorRolesFromUser(phil, message.server, message.userId);
        await DiscordPromises.giveRoleToUser(phil.bot, message.server.id, message.userId, colorRole.id);

        const compliment = BotUtils.getRandomArrayEntry(compliments);
        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: 'Your colour has been changed to **' + hexColor + '**. ' + compliment
        });
    }

    private getHexColorFromCommandArgs(commandArgs : string[]) : string {
        if (commandArgs.length === 0) {
            const decemberLink = BotUtils.getRandomArrayEntry(decemberLinks);
            throw new Error('You must provide a hex code to this function of the colour that you\'d like to use. For example, `' + process.env.COMMAND_PREFIX + 'color #FFFFFF`. You could try checking out ' + decemberLink + ' for some codes.');
        }

        var hexColor = commandArgs[0];
        if (!BotUtils.isValidHexColor(hexColor)) {
            const decemberLink = BotUtils.getRandomArrayEntry(decemberLinks);
            throw new Error('`' + hexColor + '` isn\'t a valid hex code. I\'m looking for it in the format of `#RRGGBB`. You can try checking out ' + decemberLink + ' for some amazing colours.');
        }

        hexColor = hexColor.toUpperCase();
        return hexColor;
    }

    private async removeColorRolesFromUser(phil : Phil, server : DiscordIOServer, userId : string) : Promise<void> {
        const member = server.members[userId];

        for (let roleId of member.roles) {
            if (!BotUtils.isHexColorRole(server, roleId)) {
                continue;
            }

            await DiscordPromises.takeRoleFromUser(phil.bot, server.id, userId, roleId);
        }
    }

    private async getRoleFromHexColor(phil : Phil, server : DiscordIOServer, hexColor : string) : Promise<DiscordIORole> {
        for (let roleId in server.roles) {
            let role = server.roles[roleId];
            if (role.name === hexColor) {
                return role;
            }
        }

        const hexColorNumber = parseInt(hexColor.replace('#', '0x'), 16);
        const newRole = await DiscordPromises.createRole(phil.bot, server.id);
        await DiscordPromises.editRole(phil.bot, server.id, newRole.id, {
            name: hexColor,
            color: hexColorNumber
        });
        return newRole;
    }
};
