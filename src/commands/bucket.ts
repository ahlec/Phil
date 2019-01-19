import Bucket from '../buckets';
import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

type FieldTransformFunc<T> = (bucket: Bucket, value: T) => string;

function createField<T>(
  bucket: Bucket,
  header: string,
  value: T,
  valueTransformFunc?: FieldTransformFunc<T>
) {
  let displayValue: any = value;
  if (valueTransformFunc) {
    displayValue = valueTransformFunc(bucket, value);
  }

  return {
    inline: true,
    name: header,
    value: displayValue,
  };
}

function formatBoolean(bucket: Bucket, value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatChannel(bucket: Bucket, value: string): string {
  return '<#' + value + '>';
}

function sendBucketToChannel(
  phil: Phil,
  channelId: string,
  bucket: Bucket
): Promise<string> {
  return DiscordPromises.sendEmbedMessage(phil.bot, channelId, {
    color: EmbedColor.Info,
    fields: [
      createField(bucket, 'Reference Handle', bucket.handle),
      createField(bucket, 'Display Name', bucket.displayName),
      createField(bucket, 'Database ID', bucket.id),
      createField(bucket, 'Is Valid', bucket.isValid, formatBoolean),
      createField(bucket, 'Channel', bucket.channelId, formatChannel),
      createField(
        bucket,
        'Required Member Role',
        bucket.requiredRoleId ? '<@' + bucket.requiredRoleId + '>' : 'None'
      ),
      createField(bucket, 'Is Paused', bucket.isPaused, formatBoolean),
      createField(bucket, 'Frequency', bucket.frequencyDisplayName),
    ],
    title: ':writing_hand: Prompt Bucket: ' + bucket.handle,
  });
}

export default class BucketCommand implements ICommand {
  public readonly name = 'bucket';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature = Features.Prompts;
  public readonly permissionLevel = PermissionLevel.AdminOnly;

  public readonly helpGroup = HelpGroup.Prompts;
  public readonly helpDescription =
    'Displays all of the configuration information for a prompt bucket.';

  public readonly versionAdded = 11;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      commandArgs,
      message.serverConfig,
      'bucket',
      true
    );
    return sendBucketToChannel(phil, message.channelId, bucket);
  }
}
