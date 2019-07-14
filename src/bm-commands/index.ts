import { BotManagerCommand, LoggerDefinition } from './BotManagerCommand';
import ClearCacheBotManagerCommand from './clearcache';
import EvalBotManagerCommand from './eval';
import InviteBotManagerCommand from './invite';
import VersionBotManagerCommand from './version';

const COMMAND_CONSTRUCTORS: ReadonlyArray<
  new (parentDefinition: LoggerDefinition) => BotManagerCommand
> = [
  ClearCacheBotManagerCommand,
  EvalBotManagerCommand,
  InviteBotManagerCommand,
  VersionBotManagerCommand,
];

export function instantiateCommands(
  parentDefinition: LoggerDefinition
): Map<string, BotManagerCommand> {
  const lookup = new Map<string, BotManagerCommand>();
  for (const constructor of COMMAND_CONSTRUCTORS) {
    const command = new constructor(parentDefinition);
    lookup.set(command.name, command);
  }

  return lookup;
}

export { BotManagerCommand };
