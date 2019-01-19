export default class LoggerDefinition {
  public readonly prefix: string;

  public constructor(name: string, parent?: LoggerDefinition) {
    this.prefix = `${parent ? parent.prefix : null}[${name}]`;
  }
}
