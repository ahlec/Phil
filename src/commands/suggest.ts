import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import { endOngoingDirectMessageProcesses } from '@phil/DirectMessageUtils';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
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
    const bucket = await invocation.retrieveBucketFromArguments();
    if (bucket.requiredRoleId && !bucket.canUserSubmitTo(invocation.member)) {
      const role = invocation.context.server.getRole(bucket.requiredRoleId);
      if (!role) {
        throw new Error(
          "Hmmm, in order to submit prompts to this bucket, you need to have a role that doesn't exist anymore. That doesn't seem right. Could you make sure an admin knows about this?"
        );
      }

      throw new Error(
        'In order to be able to submit a prompt to this bucket, you must have the **' +
          role.name +
          '** role.'
      );
    }

    await endOngoingDirectMessageProcesses(
      legacyPhil,
      invocation.member.user.id
    );

    const session = await SubmissionSession.startNewSession(
      legacyPhil,
      invocation.member.user.id,
      bucket
    );
    if (!session) {
      throw new Error('Unable to start a new session despite all good input.');
    }

    await this.sendDirectMessage(legacyPhil, invocation, database, session);
  }

  private async sendDirectMessage(
    legacyPhil: Phil,
    invocation: CommandInvocation,
    database: Database,
    session: SubmissionSession
  ): Promise<void> {
    const { finalMessage } = await invocation.member.user.sendDirectMessage({
      color: 'powder-blue',
      description: getBeginMessage(
        legacyPhil,
        invocation.context.serverConfig,
        session
      ),
      fields: null,
      footer: null,
      title: ':pencil: Begin Sending Suggestions :incoming_envelope:',
      type: 'embed',
    });

    const reactableFactory = new SuggestSessionReactableFactory(
      legacyPhil.bot,
      database,
      {
        timeLimit: session.remainingTime.asMinutes(),
      },
      {
        userId: invocation.member.user.id,
      },
      true
    );
    await reactableFactory.create(finalMessage);
  }
}

export default SuggestCommand;
