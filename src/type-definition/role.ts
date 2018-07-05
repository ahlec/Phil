import Phil from '../phil';
import ServerConfig from '../server-config';
import { ITypeDefinition, ParseResult, ValidityResultType } from './@type-definition';

const ROLE_LINK_PREFIX = '<@&';
const ROLE_LINK_SUFFIX = '>';
const ROLE_LINK_MARKUP_LENGTH = ROLE_LINK_PREFIX.length + ROLE_LINK_SUFFIX.length;

class RoleTypeDefinitionImplementation implements ITypeDefinition {
    public readonly rules = [
        'Must be a link to a role on the server.',
        'Must not be @here'
    ];

    public tryParse(input: string): ParseResult {
        if (!input || !input.trim()) {
            return {
                errorMessage: 'Input was undefined, null, empty, or whitespace',
                wasSuccessful: false
            };
        }

        const trimmedInput = input.trim();
        if (trimmedInput.length < ROLE_LINK_MARKUP_LENGTH ||
            !trimmedInput.startsWith(ROLE_LINK_PREFIX) ||
            !trimmedInput.endsWith(ROLE_LINK_SUFFIX)) {
            return {
                errorMessage: 'Input was not a role ID link',
                wasSuccessful: false
            };
        }

        const roleId = trimmedInput.substr(ROLE_LINK_PREFIX.length,
            trimmedInput.length - ROLE_LINK_MARKUP_LENGTH);
        if (!roleId) {
            return {
                errorMessage: 'Provided role ID link was empty',
                wasSuccessful: false
            };
        }

        return {
            parsedValue: roleId,
            wasSuccessful: true
        };
    }

    public isValid(value: string, phil: Phil, serverConfig: ServerConfig): ValidityResultType {
        if (!value) {
            return {
                errorMessage: 'No role ID was provided.',
                isValid: false
            };
        }

        const role = serverConfig.server.roles[value];
        if (!role) {
            return {
                errorMessage: 'No role with that provided ID exists within this server.',
                isValid: false
            };
        }

        return {
            isValid: true
        };
    }

    public toDisplayFormat(value: string, serverConfig: ServerConfig): string {
        const role = serverConfig.server.roles[value];
        if (!role) {
            return '(None)';
        }

        return ROLE_LINK_PREFIX + value + ROLE_LINK_SUFFIX;
    }

    public toMultilineCodeblockDisplayFormat(value: string, serverConfig: ServerConfig): string {
        const role = serverConfig.server.roles[value];
        if (!role) {
            return '(None)';
        }

        return '@' + role.name;
    }
}

export const RoleTypeDefinition = new RoleTypeDefinitionImplementation();
export default RoleTypeDefinition;
