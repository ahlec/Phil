import Stage from './@stage';

export default class FinishedStage implements Stage {
  public readonly stageNumber = 5;

  public async getMessage(): Promise<string> {
    const NOWRAP = '';
    return `All done! I've recorded your timezone information! When you mention a date ${NOWRAP}or time in the server again, I'll convert it for you! If you ever need to ${NOWRAP}change it, just start up the questionnaire again to do so!`;
  }

  public async processInput(): Promise<void> {
    throw new Error("There is nothing to process when we're finished.");
  }
}
