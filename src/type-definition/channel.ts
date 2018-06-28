import Phil from '../phil';
import ServerConfig from '../server-config';
import { ITypeDefinition, ParseResult, ValidityResultType } from './@type-definition';

class ChannelTypeDefinitionImplementation implements ITypeDefinition {
    public tryParse(input: string): ParseResult {
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

    public isValid(value: string, phil: Phil, serverConfig: ServerConfig): ValidityResultType {
        if (!value) {
            return {
                errorMessage: 'No channel ID was provided.',
                isValid: false
            };
        }

        const channel = serverConfig.server.channels[value];
        if (!channel || channel.guild_id !== serverConfig.serverId) {
            return {
                errorMessage: 'No channel with that provided ID exists within this server (at least that I have permissions to know about).',
                isValid: false
            };
        }

        return {
            isValid: true
        };
    }

    public toDisplayFormat(value: string): string {
        return '<#' + value + '>';
    }
}

export const ChannelTypeDefinition = new ChannelTypeDefinitionImplementation();
export default ChannelTypeDefinition;