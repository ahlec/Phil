import Phil from '../phil';
import ServerConfig from '../server-config';

interface IParseSuccess {
    wasSuccessful: true;
    parsedValue: string;
}

interface IParseFailure {
    wasSuccessful: false;
    errorMessage: string;
}

export type ParseResult = IParseSuccess | IParseFailure;

interface IValidResult {
    isValid: true;
}

interface IInvalidResult {
    errorMessage: string;
    isValid: false;
}

export type ValidityResultType = IValidResult | IInvalidResult;

export interface ITypeDefinition {
    readonly rules: ReadonlyArray<string>;
    tryParse(input: string): ParseResult;
    isValid(value: string, phil: Phil, serverConfig: ServerConfig): ValidityResultType;
    toDisplayFormat(value: string, serverConfig: ServerConfig): string;
    toMultilineCodeblockDisplayFormat(value: string, phil: Phil, serverConfig: ServerConfig): string;
}
