import IStage from './@stage';

import ConfirmationStageClass from './confirmation-stage';
import CountryStageClass from './country-stage';
import DeclinedStageClass from './declined-stage';
import FinishedStageClass from './finished-stage';
import LetsBeginStageClass from './lets-begin-stage';
import SpecificationStageClass from './specification-stage';

export const LetsBeginStage: IStage = new LetsBeginStageClass();
export const CountryStage: IStage = new CountryStageClass();
export const SpecificationStage: IStage = new SpecificationStageClass();
export const ConfirmationStage: IStage = new ConfirmationStageClass();
export const FinishedStage: IStage = new FinishedStageClass();
export const DeclinedStage: IStage = new DeclinedStageClass();

const AllStages: ReadonlyArray<IStage> = [
  LetsBeginStage,
  CountryStage,
  SpecificationStage,
  ConfirmationStage,
  FinishedStage,
  DeclinedStage,
];

export function getFromNumber(stageNo: number): IStage {
  for (const stage of AllStages) {
    if (stage.stageNumber === stageNo) {
      return stage;
    }
  }

  throw new Error('This user appears to be on an invalid stage: ' + stageNo);
}
