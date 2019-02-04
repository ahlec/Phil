/* tslint:disable no-console */

import LoggerDefinition from './LoggerDefinition';

export default abstract class Logger {
  protected constructor(private readonly definition: LoggerDefinition) {}

  protected async write(msg: string) {
    console.log(this.definition.prefix, msg);
  }

  protected async warn(msg: string) {
    console.warn(this.definition.prefix, msg);
  }

  protected async error(err: string | Error): Promise<void> {
    if (!err) {
      return await this.error(
        new Error('Called Logger.error without providing an error.')
      );
    }

    if (typeof err === 'string') {
      console.error(this.definition.prefix, err);
      return;
    }

    const identifier = `{${err.name}}`;
    console.error(this.definition.prefix, identifier, err.message);
    if (err.stack) {
      const stackTrace = err.stack.split('\n');
      stackTrace.forEach(line =>
        console.error(this.definition.prefix, identifier, '\t', line.trim())
      );
    } else {
      console.error(this.definition.prefix, identifier, '<no stack trace>');
    }
  }
}
