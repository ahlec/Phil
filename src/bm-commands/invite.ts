import {
  BotManagerCommand,
  LoggerDefinition,
  Phil,
  ReceivedDirectMessage,
} from './BotManagerCommand';

export default class InviteCommand extends BotManagerCommand {
  public constructor(parentDefinition: LoggerDefinition) {
    super('invite', parentDefinition);
  }

  public async execute(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    await message.respond({
      color: 'powder-blue',
      description: phil.discordClient.inviteUrl,
      fields: null,
      footer: null,
      title: ':gift: My Invite Link',
      type: 'embed',
    });
  }
}
