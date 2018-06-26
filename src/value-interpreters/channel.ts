import Phil from '../phil';
import ServerConfig from '../server-config';
import { IValueInterpreter, ParseResult } from './@value-interpreter';

class ChannelValueInterpreterImplementation implements IValueInterpreter {
    public tryParse(input: string, phil: Phil, serverConfig: ServerConfig): ParseResult {
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

        return {
            parsedValue: channelId,
            wasSuccessful: true
        };
    }

    public isValid(value: string, phil: Phil, serverConfig: ServerConfig): boolean {
        if (!value) {
            return false;
        }

        const channel = serverConfig.server.channels[value];
        if (!channel) {
            return false;
        }

        return (channel.guild_id === serverConfig.serverId);
    }
}

export const ChannelValueInterpreter = new ChannelValueInterpreterImplementation();
export default ChannelValueInterpreter;
