import { Channel as DiscordIOChannel } from 'discord.io';
import Phil from '../phil';
import ServerConfig from '../server-config';
import { IValueInterpreter, ParseResult } from './@value-interpreter';

export default class ChannelValueInterpreter implements IValueInterpreter<DiscordIOChannel> {
    public tryParse(input: string, phil: Phil, serverConfig: ServerConfig): ParseResult<DiscordIOChannel> {
        if (!input || !input.trim()) {
            return {
                errorMessage: 'Input was undefined, null, empty, or whitespace',
                wasSuccessful: false
            };
        }

        const trimmedInput = input.trim();
        if (trimmedInput.length < 4 ||
            trimmedInput[0] !== '<' ||
            trimmedInput[1] !== '#' ||
            trimmedInput[trimmedInput.length - 1] !== '>') {
            return {
                errorMessage: 'Input was not a channel ID link',
                wasSuccessful: false
            };
        }

        const channelId = trimmedInput.substr(2, trimmedInput.length - 3);
        if (!channelId) {
            return {
                errorMessage: 'Provided channel ID link was empty',
                wasSuccessful: false
            };
        }

        const channel = serverConfig.server.channels[channelId];
        if (!channel) {
            return {
                errorMessage: 'There is no channel on this server with the provided channel ID',
                wasSuccessful: false
            };
        }

        return {
            parsedValue: channel,
            wasSuccessful: true
        };
    }

    public isValid(value: DiscordIOChannel, phil: Phil, serverConfig: ServerConfig): boolean {
        if (!value) {
            return false;
        }

        return (value.guild_id === serverConfig.serverId);
    }
}
