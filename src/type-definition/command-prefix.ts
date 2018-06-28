import GlobalConfig from '../global-config';
import Phil from '../phil';
import ServerConfig from '../server-config';
import { ITypeDefinition, ParseResult, ValidityResultType } from './@type-definition';

interface IInvalidPrefixCharacterDefinition {
    character: string;
    name: string;
}

const InvalidPrefixCharacters: ReadonlyArray<IInvalidPrefixCharacterDefinition> = [
    { character: '`', name: 'tilde' },
    { character: '#', name: 'hash' },
    { character: '@', name: 'at sign' }
];

class CommandPrefixTypeDefinitionImplementation implements ITypeDefinition {
    public tryParse(input: string): ParseResult {
        if (!input) {
            return {
                errorMessage: 'A command prefix must be at least one character in length.',
                wasSuccessful: false
            };
        }

        for (const invalidCharacter of InvalidPrefixCharacters) {
            if (input.indexOf(invalidCharacter.character) < 0) {
                continue;
            }

            return {
                errorMessage: `A command prefix may not contain the ${invalidCharacter.name} (${
                    invalidCharacter.character}) character.`,
                wasSuccessful: false
            };
        }

        if (input.length > GlobalConfig.maxCommandPrefixLength) {
            return {
                errorMessage: 'A command prefix cannot be longer than ' + GlobalConfig.maxCommandPrefixLength + ' characters.',
                wasSuccessful: false
            };
        }

        return {
            parsedValue: input,
            wasSuccessful: true
        };
    }

    public isValid(value: string, phil: Phil, serverConfig: ServerConfig): ValidityResultType {
        return {
            isValid: true
        };
    }

    public toDisplayFormat(value: string): string {
        return value;
    }
}

export const CommandPrefixTypeDefinition = new CommandPrefixTypeDefinitionImplementation();
export default CommandPrefixTypeDefinition;
