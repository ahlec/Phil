import { EmbedField } from '@phil/discord/MessageTemplate';

import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Command, { LoggerDefinition } from './@types';

type FieldTransformFunc<T> = (bucket: Bucket, value: T) => string;

function createField<T extends string | number | boolean>(
  bucket: Bucket,
  header: string,
  value: T,
  valueTransformFunc?: FieldTransformFunc<T>
): EmbedField {
  let displayValue: string;
  if (valueTransformFunc) {
    displayValue = valueTransformFunc(bucket, value);
  } else {
    displayValue = value.toString();
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

async function sendBucketToChannel(
  invocation: CommandInvocation,
  bucket: Bucket
): Promise<void> {
  await invocation.respond({
    color: 'powder-blue',
    description: null,
    fields: [
      createField(bucket, 'Reference Handle', bucket.handle),
      createField(bucket, 'Display Name', bucket.displayName),
      createField(bucket, 'Database ID', bucket.id),
      createField(bucket, 'Is Valid', bucket.isValid, formatBoolean),
      createField(
        bucket,
        'Channel',
        bucket.channel ? `<#${bucket.channel.id}>` : 'None'
      ),
      createField(
        bucket,
        'Required Member Role',
        bucket.requiredRoleId ? '<@' + bucket.requiredRoleId + '>' : 'None'
      ),
      createField(bucket, 'Is Paused', bucket.isPaused, formatBoolean),
      createField(bucket, 'Frequency', bucket.frequencyDisplayName),
    ],
    footer: null,
    title: ':writing_hand: Prompt Bucket: ' + bucket.handle,
    type: 'embed',
  });
}

class BucketCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('bucket', parentDefinition, {
      feature: Features.Prompts,
      helpDescription:
        'Displays all of the configuration information for a prompt bucket.',
      helpGroup: HelpGroup.Prompts,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 11,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const bucket = await invocation.retrieveBucketFromArguments({
      allowInvalid: true,
    });
    await sendBucketToChannel(invocation, bucket);
  }
}

export default BucketCommand;
