import Logger from '@phil/Logger';
import LoggerDefinition from '@phil/LoggerDefinition';
import PrivateMessage from '@phil/messages/private';
import Phil from '@phil/phil';

export abstract class BotManagerCommand extends Logger {
  public constructor(
    public readonly name: string,
    parentDefinition: LoggerDefinition
  ) {
    super(new LoggerDefinition(name, parentDefinition));
  }

  public abstract execute(
    phil: Phil,
    message: PrivateMessage,
    args: string
  ): Promise<void>;
}

export { LoggerDefinition, Phil, PrivateMessage };
