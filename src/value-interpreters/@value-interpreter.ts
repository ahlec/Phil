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

export interface IValueInterpreter {
    tryParse(input: string, phil: Phil, serverConfig: ServerConfig): ParseResult;
    isValid(value: string, phil: Phil, serverConfig: ServerConfig): boolean;
}
