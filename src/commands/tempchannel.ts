import CommandArgs from '../CommandArgs';
import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import TempChannelConfirmationReactableFactory from '../reactables/temp-channel-confirmation/factory';
import ServerConfig from '../server-config';
import TemporaryChannel, {
  MAX_NUMBER_EXISTANT_CHANNELS_PER_USER,
} from '../TemporaryChannel';
import TempChannelNameTypeDefinition, {
  CHANNEL_NAME_PREFIX,
} from '../type-definition/temp-channel-name';
import { makeBulletList } from '../utils';
import Command, { LoggerDefinition } from './@types';

export default class TempChannelCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('tempchannel', parentDefinition, {
      aliases: ['temporarychannel', 'makechannel', 'spawnchannel'],
      feature: Features.TemporaryChannels,
      helpDescription:
        'Creates a temporary text channel around a particular topic that lasts for a couple of hours.',
      versionAdded: 14,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    rawCommandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const commandArgs = new CommandArgs(rawCommandArgs);
    if (commandArgs.isEmpty) {
      return this.processNoCommandArgs(
        phil,
        message.channelId,
        message.serverConfig
      );
    }

    const channelTopic = commandArgs.readString('channel-topic');
    const parseResult = TempChannelNameTypeDefinition.tryParse(channelTopic);
    if (parseResult.wasSuccessful === false) {
      return this.reportError(
        phil,
        message.channelId,
        parseResult.errorMessage
      );
    }

    const { parsedValue: channelName } = parseResult;
    const validityResult = TempChannelNameTypeDefinition.isValid(
      channelName,
      phil,
      message.serverConfig
    );
    if (validityResult.isValid === false) {
      return this.reportError(
        phil,
        message.channelId,
        validityResult.errorMessage
      );
    }

    const numUserChannels = await TemporaryChannel.countUsersChannels(
      phil.db,
      message.server,
      message.userId
    );
    if (numUserChannels >= MAX_NUMBER_EXISTANT_CHANNELS_PER_USER) {
      return this.reportError(
        phil,
        message.channelId,
        `You've created ${numUserChannels} temporary channels recently, and hit your limit of ${MAX_NUMBER_EXISTANT_CHANNELS_PER_USER}.`
      );
    }

    const messageId = await DiscordPromises.sendEmbedMessage(
      phil.bot,
      message.channelId,
      {
        color: EmbedColor.Info,
        description: `You asked me to create the temporary channel **${channelName}**. Is this correct?`,
        title: `Confirm Temporary Channel`,
      }
    );

    const factory = new TempChannelConfirmationReactableFactory(
      phil.bot,
      phil.db,
      {
        channelId: message.channelId,
        messageId,
        tempChannelName: channelName,
        timeLimit: 10,
        topic: channelTopic,
        user: message.user,
      }
    );
    await factory.create();
  }

  private async processNoCommandArgs(
    phil: Phil,
    channelId: string,
    serverConfig: ServerConfig
  ): Promise<any> {
    const message = `When using this command, you must provide the topic of the channel that you want to make. For instance, if you wanted to make a channel called \`#${CHANNEL_NAME_PREFIX}gaming-meetup\`, you would say \`${
      serverConfig.commandPrefix
    }tempchannel gaming-meetup\`. There are some rules surrounding this:\n${makeBulletList(
      TempChannelNameTypeDefinition.rules
    )}\nAdditionally, you are only allowed to make ${MAX_NUMBER_EXISTANT_CHANNELS_PER_USER} ${
      MAX_NUMBER_EXISTANT_CHANNELS_PER_USER === 1 ? 'channel' : 'channels'
    }within a short window of time.`;
    return this.reportError(phil, channelId, message);
  }
}
