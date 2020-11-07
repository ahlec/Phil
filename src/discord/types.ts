import Member from './Member';
import Message from './Message';
import MessageTemplate from './MessageTemplate';
import OutboundMessage from './OutboundMessage';
import ReceivedDirectMessage from './ReceivedDirectMessage';
import ReceivedServerMessage from './ReceivedServerMessage';
import Server from './Server';
import User from './User';

export interface SendMessageResult {
  /**
   * The Discord message for the final message sent.
   * Some messages will actually require multiple Discord messages
   * to be completely sent due to maximum message length; this is the
   * the final message, which can be useful for adding reactions
   * and other things to the visual "end" of the post.
   */
  finalMessage: OutboundMessage;
}

export interface BaseChannel {
  readonly id: string;

  /**
   * Fetches a message that was sent by this bot (whether in this session or a
   * previous session) in this channel, by the unique message Snowflake.
   *
   * If there is no message found, this will return `null`.
   *
   * @throws If the message was found, but was NOT sent by the bot. If the
   * message is not found, it will not throw an error.
   * @param messageId The snowflake for the message that was sent in this
   * channel, by this bot user.
   */
  getOutboundMessageById(messageId: string): Promise<OutboundMessage | null>;

  sendMessage(template: MessageTemplate): Promise<SendMessageResult>;
}

export interface ClientDebugData {
  message: string;
  data: Record<string, string | number>;
}

export interface ClientWarning {
  message: string;
  data: Record<string, string | number>;
}

export interface ClientError {
  message: string;
  data: Record<string, string | number>;
}

export interface Reaction {
  /**
   * The name of the emoji that is this reaction.
   */
  name: string;

  /**
   * The user who has left this reaction.
   */
  user: User;
}

export type DebugEventHandler = (contents: ClientDebugData) => void;
export type ErrorEventHandler = (error: ClientError) => void;
export type MemberJoinedServerEventHandler = (
  member: Member,
  server: Server
) => void | Promise<void>;
export type MessageReceivedEventHandler = (
  message: ReceivedDirectMessage | ReceivedServerMessage
) => void | Promise<void>;
export type ReactionAddedToMessageEventHandler = (
  reaction: Reaction,
  message: Message
) => void;
export type WarningEventHandler = (
  warning: ClientWarning
) => void | Promise<void>;
