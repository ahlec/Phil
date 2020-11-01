import OutboundMessage from './OutboundMessage';

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
