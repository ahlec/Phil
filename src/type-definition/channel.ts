import Server from '@phil/discord/Server';

import {
  FormatResult,
  ParseResult,
  TypeDefinition,
  ValidityResultType,
} from './@type-definition';

class ChannelTypeDefinitionImplementation implements TypeDefinition {
  public readonly rules = [
    'Must be a link to an existing channel on the server.',
    'Must be a channel that Phil has permissions to access and know about.',
  ];

  public tryParse(input: string): ParseResult {
    if (!input || !input.trim()) {
      return {
        errorMessage: 'Input was undefined, null, empty, or whitespace',
        wasSuccessful: false,
      };
    }

    const trimmedInput = input.trim();
    if (
      trimmedInput.length < 4 ||
      trimmedInput[0] !== '<' ||
      trimmedInput[1] !== '#' ||
      trimmedInput[trimmedInput.length - 1] !== '>'
    ) {
      return {
        errorMessage: 'Input was not a channel ID link',
        wasSuccessful: false,
      };
    }

    const channelId = trimmedInput.substr(2, trimmedInput.length - 3);
    if (!channelId) {
      return {
        errorMessage: 'Provided channel ID link was empty',
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: channelId,
      wasSuccessful: true,
    };
  }

  public async isValid(
    value: string,
    server: Server
  ): Promise<ValidityResultType> {
    if (!value) {
      return {
        errorMessage: 'No channel ID was provided.',
        isValid: false,
      };
    }

    const channel = server.getTextChannel(value);
    if (!channel) {
      return {
        errorMessage:
          'No channel with that provided ID exists within this server (at least that I have permissions to know about).',
        isValid: false,
      };
    }

    return {
      isValid: true,
    };
  }

  public async format(
    value: string | null,
    server: Server
  ): Promise<FormatResult> {
    if (!value) {
      return {
        multilineCodeBlock: '(None)',
        regularChat: '(None)',
      };
    }

    const channel = server.getTextChannel(value);
    if (!channel) {
      return {
        multilineCodeBlock: '(None)',
        regularChat: '(None)',
      };
    }

    return {
      multilineCodeBlock: `#${channel.name}`,
      regularChat: `<#${channel.id}>`,
    };
  }
}

export const ChannelTypeDefinition = new ChannelTypeDefinitionImplementation();
export default ChannelTypeDefinition;
