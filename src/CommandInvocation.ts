import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';

import MessageTemplate from '@phil/discord/MessageTemplate';
import Server from '@phil/discord/Server';

import Bucket from './buckets';
import { Mention } from '@phil/messages/base';
import PublicMessage from '@phil/messages/public';
import ServerConfig from './server-config';
import { deleteMessage } from './promises/discord';
import ServerBucketsCollection from './ServerBucketsCollection';
import { getRandomArrayEntry } from './utils';
import {
  sendMessageTemplate,
  SendMessageResult,
} from './utils/discord-migration';

interface InvocationContext {
  buckets: ServerBucketsCollection;
  channelId: string;
  server: Server;
  serverConfig: ServerConfig;
}

function multipleUnspecifiedBucketsError(
  serverConfig: ServerConfig,
  serverBuckets: readonly Bucket[],
  commandName: string
): Error {
  if (serverBuckets.length === 0) {
    return new Error('There are no prompt buckets configured on this server.');
  }

  let message =
    'This command must be provided the valid reference handle of one of the buckets configured on this server:\n\n';

  for (const bucket of serverBuckets) {
    message += '`' + bucket.handle + '` - ' + bucket.displayName + ' (';

    if (bucket.isValid) {
      message += 'posts to <#' + bucket.channelId + '>';
    } else {
      message += 'configuration invalid';
    }

    message += ')\n';
  }

  const randomBucket = getRandomArrayEntry(serverBuckets);
  message +=
    '\nPlease try the command once more, specifying which bucket, like `' +
    serverConfig.commandPrefix +
    commandName +
    ' ' +
    randomBucket.handle +
    '`.';
  return new Error(message);
}

function getOnlyBucketOnServer(
  serverConfig: ServerConfig,
  serverBuckets: readonly Bucket[],
  commandName: string,
  allowInvalidServers: boolean
): Bucket {
  if (
    serverBuckets.length === 1 &&
    (allowInvalidServers || serverBuckets[0].isValid)
  ) {
    return serverBuckets[0];
  }

  throw multipleUnspecifiedBucketsError(
    serverConfig,
    serverBuckets,
    commandName
  );
}

class CommandInvocation {
  public static parseFromMessage(
    client: DiscordIOClient,
    context: InvocationContext,
    message: PublicMessage
  ): CommandInvocation | null {
    if (!message.content) {
      return null;
    }

    const words = message.content
      .split(' ')
      .filter((word) => word.trim().length > 0);
    if (!words.length) {
      return null;
    }

    const prompt = words[0].toLowerCase();
    if (!prompt.startsWith(context.serverConfig.commandPrefix)) {
      return null;
    }

    const commandName = prompt.substr(
      context.serverConfig.commandPrefix.length
    );
    return new CommandInvocation(
      client,
      commandName,
      words.slice(1),
      message,
      context
    );
  }

  private constructor(
    private readonly discordClient: DiscordIOClient,
    public readonly commandName: string,
    public readonly commandArgs: ReadonlyArray<string>,
    private readonly message: PublicMessage,
    public readonly context: InvocationContext
  ) {}

  public get mentions(): readonly Mention[] {
    return this.message.mentions;
  }

  public get user(): DiscordIOUser {
    return this.message.user;
  }

  public get userId(): string {
    return this.message.userId;
  }

  public async respond(response: MessageTemplate): Promise<SendMessageResult> {
    return sendMessageTemplate(
      this.discordClient,
      this.message.channelId,
      response
    );
  }

  /**
   * Retrieves the bucket specified in the command arguments
   *
   * @warning This is legacy behaviour and we should write a better
   * version in the future.
   */
  public async retrieveBucketFromArguments(
    options: {
      /**
       * If true, buckets which aren't valid for use will be returned.
       * If false, buckets which aren't valid will be ignored as though
       * they don't exist.
       *
       * Defaults to false if not provided.
       */
      allowInvalid?: boolean;
    } = {}
  ): Promise<Bucket> {
    const { allowInvalid = false } = options;

    const [firstParameter] = this.commandArgs;
    if (!firstParameter) {
      const serverBuckets = await this.context.buckets.getAll();
      return getOnlyBucketOnServer(
        this.context.serverConfig,
        serverBuckets,
        this.commandName,
        allowInvalid
      );
    }

    const bucket = await this.context.buckets.retrieve({
      handle: firstParameter,
      type: 'reference-handle',
    });
    if (!bucket || (!allowInvalid && !bucket.isValid)) {
      const serverBuckets = await this.context.buckets.getAll();
      throw multipleUnspecifiedBucketsError(
        this.context.serverConfig,
        serverBuckets,
        this.commandName
      );
    }

    return bucket;
  }

  /**
   * Deletes the Discord message that invoked this command. That is,
   * this will delete the user-sent message that triggered this command.
   */
  public deleteInvocationMessage(): Promise<void> {
    return deleteMessage(
      this.discordClient,
      this.message.channelId,
      this.message.id
    );
  }
}

export default CommandInvocation;
