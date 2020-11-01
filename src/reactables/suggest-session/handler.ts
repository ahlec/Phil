import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '@phil/phil';
import SubmissionSession from '@phil/prompts/submission-session';
import ReactablePost from '@phil/reactables/post';
import { ReactableHandler, ReactableType } from '@phil/reactables/types';
import SuggestSessionReactableFactory from './factory';
import { Emoji } from './shared';
import { sendMessageTemplate } from '@phil/utils/discord-migration';

class SuggestSessionReactableHandler
  implements ReactableHandler<ReactableType.SuggestSession> {
  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost<ReactableType.SuggestSession>,
    event: OfficialDiscordReactionEvent
  ): Promise<void> {
    const activeSession = await SubmissionSession.getActiveSession(
      phil,
      post.data.userId
    );
    if (!activeSession) {
      return;
    }

    switch (event.emoji.name) {
      case Emoji.Stop: {
        await this.stopSession(phil, post, activeSession);
        break;
      }

      case Emoji.MakeAnonymous: {
        await this.makeSessionAnonymous(phil, post, activeSession);
        break;
      }
    }
  }

  private async stopSession(
    phil: Phil,
    post: ReactablePost<ReactableType.SuggestSession>,
    session: SubmissionSession
  ): Promise<void> {
    await post.remove(phil.db);

    await session.end(phil);
    await sendMessageTemplate(phil.bot, post.data.userId, {
      color: 'powder-blue',
      description: this.getWrapupMessage(session),
      fields: null,
      footer: null,
      title: ':ribbon: Suggestions Session Ended :ribbon:',
      type: 'embed',
    });
  }

  private getWrapupMessage(activeSession: SubmissionSession): string {
    const NOWRAP = '';
    let message = '';

    const numSubmitted = activeSession.getNumberSubmissions();
    if (numSubmitted > 0) {
      const suggestion = numSubmitted === 1 ? 'suggestion' : 'suggestions';
      const it = numSubmitted === 1 ? 'It' : 'They';
      message += `Thank you for submitting your ${suggestion}! During this session, you ${NOWRAP} sent in **${numSubmitted}** ${suggestion}. ${it} will now ${NOWRAP} need to be processed by the server admins. Should ${it.toLowerCase()} ${NOWRAP} be approved, ${it.toLowerCase()} will go into the prompt queue and wind ${NOWRAP} up being posted one day! Thank you!!\n\n`;
    }

    message += `Should you want to suggest something, just start a new session. I'm always ${NOWRAP} listening and eager to hear your suggestions!`;

    return message;
  }

  private async makeSessionAnonymous(
    phil: Phil,
    post: ReactablePost<ReactableType.SuggestSession>,
    session: SubmissionSession
  ): Promise<void> {
    await post.remove(phil.db);

    await session.makeAnonymous(phil);
    const NOWRAP = '';
    const { finalMessage } = await sendMessageTemplate(
      phil.bot,
      post.data.userId,
      {
        color: 'powder-blue',
        description: `All submissions you send during this session will be anonymous. Don't ${NOWRAP}worry though! You'll still get credit for them on the server leaderboard!`,
        fields: null,
        footer: null,
        title: ':spy: Anonymous Session Begun :spy:',
        type: 'embed',
      }
    );

    const reactableFactory = new SuggestSessionReactableFactory(
      phil.db,
      {
        timeLimit: session.remainingTime.asMinutes(),
      },
      {
        userId: post.data.userId,
      },
      false
    );

    await reactableFactory.create(finalMessage);
  }
}

export default SuggestSessionReactableHandler;
