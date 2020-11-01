import User from '@phil/discord/User';

import { ConfirmationStage } from './@all-stages';
import Stage from './@stage';

import Database from '@phil/database';

export async function sendStageMessage(
  db: Database,
  user: User,
  stage: Stage
): Promise<void> {
  const message = await stage.getMessage(db, user.id);
  await user.sendDirectMessage({
    text: message,
    type: 'plain',
  });
}

export async function setStage(
  db: Database,
  user: User,
  stage: Stage
): Promise<void> {
  const results = await db.query(
    'UPDATE timezones SET stage = $1 WHERE userid = $2',
    [stage.stageNumber, user.id]
  );
  if (results.rowCount === 0) {
    throw new Error(
      'There were no database records updated when making the database update query call.'
    );
  }

  await sendStageMessage(db, user, stage);
}

export async function setTimezone(
  db: Database,
  user: User,
  timezoneName: string
): Promise<void> {
  const results = await db.query(
    'UPDATE timezones SET timezone_name = $1 WHERE userid = $2',
    [timezoneName, user.id]
  );
  if (results.rowCount === 0) {
    throw new Error('Could not update the timezone field in the database.');
  }

  setStage(db, user, ConfirmationStage);
}
