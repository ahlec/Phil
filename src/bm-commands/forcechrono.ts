import Server from '@phil/discord/Server';

import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  ReceivedDirectMessage,
} from './BotManagerCommand';

interface CommandArguments {
  server: Server;
  chronoHandle: string;
}

type ParseResults =
  | {
      success: true;
      args: CommandArguments;
    }
  | {
      success: false;
      error: string;
    };

const ONLY_DIGITS_REGEX = /^\d+$/;

function parseCommandArgs(rawArgs: string, phil: Phil): ParseResults {
  const pieces = rawArgs.split(' ');
  if (pieces.length !== 2) {
    return {
      error: `Command requires two arguments.`,
      success: false,
    };
  }

  const server = phil.discordClient.getServer(pieces[0]);
  if (!server) {
    return {
      error: `Could not retrieve server '${pieces[0]}'.`,
      success: false,
    };
  }

  let chronoHandle: string;
  if (ONLY_DIGITS_REGEX.test(pieces[1])) {
    const chronoId = parseInt(pieces[1], 10);
    if (chronoId <= 0) {
      return {
        error: `The chrono ID must be a positive, nonzero number. (received ${chronoId})`,
        success: false,
      };
    }

    const handle = phil.chronoManager.getChronoHandleFromDatabaseId(chronoId);
    if (!handle) {
      return {
        error: `Could not find a chrono by looking up its database ID. (looked for '${chronoId}')`,
        success: false,
      };
    }

    chronoHandle = handle;
  } else {
    if (!phil.chronoManager.isRegisteredChrono(pieces[1])) {
      return {
        error: `Could not find a chrono by looking up its handle. (looked for '${pieces[1]}')`,
        success: false,
      };
    }

    chronoHandle = pieces[1];
  }

  return {
    args: {
      chronoHandle,
      server,
    },
    success: true,
  };
}

class ForceChronoBotManagerCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('forcechrono', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: ReceivedDirectMessage,
    rawArgs: string
  ): Promise<void> {
    const args = parseCommandArgs(rawArgs, phil);
    if (!args.success) {
      await message.respond({
        color: 'red',
        description: args.error,
        fields: null,
        footer: `Bot command format: \`> forcechrono {server id:snowflake} {chrono id:number | chrono handle:string}\``,
        title: ':stop_sign: Bad arguments',
        type: 'embed',
      });
      return;
    }

    const results = await phil.chronoManager.forceRunChrono(
      args.args.chronoHandle,
      args.args.server
    );

    if (!results.success) {
      await message.respond({
        color: 'red',
        description: results.error,
        fields: [
          {
            name: 'server ID',
            value: args.args.server.id,
          },
          {
            name: 'chrono handle',
            value: args.args.chronoHandle,
          },
        ],
        footer: null,
        title: ':no_entry: Chrono invocation error',
        type: 'embed',
      });
      return;
    }

    await message.respond({
      color: 'green',
      description: null,
      fields: [
        {
          name: 'server ID',
          value: args.args.server.id,
        },
        {
          name: 'chrono handle',
          value: args.args.chronoHandle,
        },
        {
          name: 'did run chrono',
          value: results.didRunChrono ? 'yes' : 'no',
        },
      ],
      footer: null,
      title: ':white_check_mark: Forced Chrono Execution Successful',
      type: 'embed',
    });
  }
}

export default ForceChronoBotManagerCommand;
