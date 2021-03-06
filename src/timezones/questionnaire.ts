import User from '@phil/discord/User';

import {
  CountryStage,
  LetsBeginStage,
  FinishedStage,
  getFromNumber,
} from './questionnaire-stages/@all-stages';
import IStage from './questionnaire-stages/@stage';
import { sendStageMessage } from './questionnaire-stages/@utils';

import Database from '@phil/database';
import { endOngoingDirectMessageProcesses } from '@phil/DirectMessageUtils';
import Phil from '@phil/phil';

async function canStartQuestionnaire(
  db: Database,
  userId: string,
  manuallyStartedQuestionnaire: boolean
): Promise<boolean> {
  if (manuallyStartedQuestionnaire) {
    // Even if they've previously rejected the questionnaire, if they're manually starting it now, go ahead.
    return true;
  }

  const results = await db.query<{ will_provide: string }>(
    'SELECT will_provide FROM timezones WHERE userid = $1',
    [userId]
  );
  if (results.rowCount === 0) {
    return true;
  }

  if (!results.rows[0].will_provide) {
    return false;
  }

  return true;
}

export function isCurrentlyDoingQuestionnaire(stage: IStage): boolean {
  return stage.stageNumber < FinishedStage.stageNumber;
}

export async function startQuestionnaire(
  user: User,
  phil: Phil,
  manuallyStartedQuestionnaire: boolean
): Promise<boolean> {
  const canStart = await canStartQuestionnaire(
    phil.db,
    user.id,
    manuallyStartedQuestionnaire
  );
  if (!canStart) {
    return false;
  }

  await endOngoingDirectMessageProcesses(phil, user.id);

  await phil.db.query('DELETE FROM timezones WHERE userid = $1', [user.id]);

  const initialStage = manuallyStartedQuestionnaire
    ? CountryStage
    : LetsBeginStage;
  await phil.db.query(
    'INSERT INTO timezones(username, userid, stage) VALUES($1, $2, $3)',
    [user.username, user.id, initialStage.stageNumber]
  );

  await sendStageMessage(phil.db, user, initialStage);
  return true;
}

export async function getStageForUser(
  db: Database,
  userId: string
): Promise<IStage | null> {
  const results = await db.query<{ stage: string }>(
    'SELECT stage FROM timezones WHERE userid = $1 LIMIT 1',
    [userId]
  );
  if (results.rowCount !== 1) {
    return null;
  }

  const stageNo = parseInt(results.rows[0].stage, 10);
  return getFromNumber(stageNo);
}

export async function endQuestionnaire(
  db: Database,
  userId: string
): Promise<void> {
  await db.execute(
    `DELETE FROM
        timezones
      WHERE
        userid = $1 AND
        stage < $2`,
    [userId, FinishedStage.stageNumber]
  );
}
