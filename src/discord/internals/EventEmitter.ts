class EventEmitter<
  TEventMap extends {
    [eventName: string]: (...args: unknown[]) => void;
  }
> {
  private readonly handlers: {
    [eventName: string]: Array<(...args: unknown[]) => void>;
  } = {};

  public on<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    handler: TEventMap[TEventName]
  ): void {
    const nameStr = eventName.toString();
    if (!this.handlers[nameStr]) {
      this.handlers[nameStr] = [];
    }

    this.handlers[nameStr].push(handler);
  }

  protected emit<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    args: Parameters<TEventMap[TEventName]>
  ): void {
    const handlers = this.handlers[eventName.toString()];
    if (!handlers || !handlers.length) {
      return;
    }

    handlers.forEach((handler): void => {
      handler(...args);
    });
  }
}

export default EventEmitter;
