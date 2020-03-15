import Stage from './@stage';

export default class DeclinedStage implements Stage {
  public readonly stageNumber = 6;

  public async getMessage(): Promise<string> {
    return `Understood. I've made a note that you don't want to provide this information at this time. I won't bother you again. If you ever change your mind, feel free to start the questionnaire again.`;
  }

  public async processInput(): Promise<void> {
    throw new Error(
      'There is nothing to process when the user has declined the questionnaire.'
    );
  }
}
