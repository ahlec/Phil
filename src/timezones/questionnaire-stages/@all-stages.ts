import IStage from './@stage';

import ConfirmationStage from './confirmation-stage';
import CountryStage from './country-stage';
import DeclinedStage from './declined-stage';
import FinishedStage from './finished-stage';
import LetsBeginStage from './lets-begin-stage';
import SpecificationStage from './specification-stage';

// Disable alphabetical sorting for this file.
// In order to make it easier to understand, let's keep the list of stages here in the other in
// which they occur during the questionnaire. This way, it'll be easier to know if we're missing
// a stage or to locate something if it isn't correct.
/* tslint:disable:object-literal-sort-keys */

export namespace Stages {
  export const LetsBegin: IStage = new LetsBeginStage();
  export const Country: IStage = new CountryStage();
  export const Specification: IStage = new SpecificationStage();
  export const Confirmation: IStage = new ConfirmationStage();
  export const Finished: IStage = new FinishedStage();
  export const Declined: IStage = new DeclinedStage();

  const AllStages: ReadonlyArray<IStage> = [
    LetsBegin,
    Country,
    Specification,
    Confirmation,
    Finished,
    Declined,
  ];

  export function getFromNumber(stageNo: number): IStage {
    for (const stage of AllStages) {
      if (stage.stageNumber === stageNo) {
        return stage;
      }
    }

    throw new Error('This user appears to be on an invalid stage: ' + stageNo);
  }
}

export default Stages;
