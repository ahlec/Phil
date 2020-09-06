import Member from '@phil/discord/Member';
import MessageTemplate from '@phil/discord/MessageTemplate';

import Database from './database';
import Features from './features/all-features';
import ServerConfig from './server-config';

export type Greeting =
  | {
      valid: false;
      reason: 'no-configured-welcome-message';
    }
  | {
      valid: true;
      message: MessageTemplate;
    };

export function greetMember(
  serverConfig: ServerConfig,
  member: Member
): Greeting {
  if (!serverConfig.welcomeMessage) {
    return {
      reason: 'no-configured-welcome-message',
      valid: false,
    };
  }

  return {
    message: {
      text: serverConfig.welcomeMessage
        .replace(/\{user\}/g, '<@' + member.user.id + '>')
        .replace(/\{name\}/g, member.displayName || 'new member'),
      type: 'plain',
    },
    valid: true,
  };
}

export type AutomaticGreetingDetermination =
  | {
      shouldGreet: false;
      reason:
        | 'feature-disabled'
        | 'user-is-discord-bot'
        | 'no-configured-welcome-message';
    }
  | {
      shouldGreet: true;
    };

export async function shouldAutomaticallyGreetMember(
  database: Database,
  serverConfig: ServerConfig,
  member: Member
): Promise<AutomaticGreetingDetermination> {
  const isEnabled = await Features.WelcomeMessage.getIsEnabled(
    database,
    serverConfig.server.id
  );
  if (!isEnabled) {
    return {
      reason: 'feature-disabled',
      shouldGreet: false,
    };
  }

  if (member.user.isBot) {
    return {
      reason: 'user-is-discord-bot',
      shouldGreet: false,
    };
  }

  if (!serverConfig.welcomeMessage) {
    return {
      reason: 'no-configured-welcome-message',
      shouldGreet: false,
    };
  }

  return {
    shouldGreet: true,
  };
}
