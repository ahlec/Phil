import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import { endOngoingDirectMessageProcesses } from '@phil/DirectMessageUtils';
import EmbedColor from '@phil/embed-color';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import { sendEmbedMessage } from '@phil/promises/discord';
import SubmissionSession from '@phil/prompts/submission-session';
import SuggestSessionReactableFactory from '@phil/reactables/suggest-session/factory';
import { Emoji } from '@phil/reactables/suggest-session/shared';
import ServerConfig from '@phil/server-config';
import Command, { LoggerDefinition } from './@types';

function getBeginMessage(
  phil: Phil,
  serverConfig: ServerConfig,
  session: SubmissionSession
): string {
  const server = phil.bot.servers[session.bucket.serverId];
  const NOWRAP = '';
  return `For the next **${session.remainingTime.asMinutes()} minutes**, every ${NOWRAP}message you send to me will be submitted as a new prompt to the **${
    session.bucket.displayName
  }** on the **${
    server.name
  }** server.\n\nWhen ${NOWRAP}you're finished, hit the ${
    Emoji.Stop
  } reaction ${NOWRAP}or simply do nothing until your session runs out of time. ${NOWRAP}If you want to change which server or bucket you're submitting to, ${NOWRAP}use the \`${
    serverConfig.commandPrefix
  }suggest\`to start over.\n\nIf you want ${NOWRAP}these submissions to be anonymous during this session, hit the ${
    Emoji.MakeAnonymous
  } reaction below.`;
}

class SuggestCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('suggest', parentDefinition, {
      feature: Features.Prompts,
      helpDescription: 'Suggests a new prompt to Phil.',
      helpGroup: HelpGroup.Prompts,
      versionAdded: 1,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const bucket = await Bucket.retrieveFromCommandArgs(
      legacyPhil,
      invocation.commandArgs,
      invocation.context.serverConfig,
      this.name,
      false
    );
    if (
      bucket.requiredRoleId &&
      !(await bucket.canUserSubmitTo(legacyPhil.bot, invocation.userId))
    ) {
      const role = invocation.server.roles[bucket.requiredRoleId];
      throw new Error(
        'In order to be able to submit a prompt to this bucket, you must have \
                the **' +
          role.name +
          '** role.'
      );
    }

    await endOngoingDirectMessageProcesses(legacyPhil, invocation.userId);

    const session = await SubmissionSession.startNewSession(
      legacyPhil,
      invocation.userId,
      bucket
    );
    if (!session) {
      throw new Error('Unable to start a new session despite all good input.');
    }

    await this.sendDirectMessage(
      legacyPhil,
      invocation.userId,
      invocation.context.serverConfig,
      session
    );
  }

  private async sendDirectMessage(
    legacyPhil: Phil,
    userId: string,
    serverConfig: ServerConfig,
    session: SubmissionSession
  ): Promise<void> {
    const messageId = await sendEmbedMessage(legacyPhil.bot, userId, {
      color: EmbedColor.Info,
      description: getBeginMessage(legacyPhil, serverConfig, session),
      title: ':pencil: Begin Sending Suggestions :incoming_envelope:',
    });

    const reactableFactory = new SuggestSessionReactableFactory(
      legacyPhil.bot,
      legacyPhil.db,
      {
        canMakeAnonymous: true,
        channelId: userId,
        messageId,
        timeLimit: session.remainingTime.asMinutes(),
        user: legacyPhil.bot.users[userId],
      }
    );
    await reactableFactory.create();
  }
}

export default SuggestCommand;
