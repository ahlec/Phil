import Stages from './questionnaire-stages/@all-stages';
import IStage from './questionnaire-stages/@stage';
import QuestionnaireStageUtils from './questionnaire-stages/@utils';

import Database from '../database';
import Phil from '../phil';

async function canStartQuestionnaire(db: Database, userId: string, manuallyStartedQuestionnaire: boolean): Promise<boolean> {
    if (manuallyStartedQuestionnaire) {
        // Even if they've previously rejected the questionnaire, if they're manually starting it now, go ahead.
        return true;
    }

    const results = await db.query('SELECT will_provide FROM timezones WHERE userid = $1', [userId]);
    if (results.rowCount === 0) {
        return true;
    }

    if (!results.rows[0].will_provide) {
        return false;
    }

    return true;
}

export namespace TimezoneQuestionnaire {
    export function isCurrentlyDoingQuestionnaire(stage: IStage): boolean {
        return (stage.stageNumber < Stages.Finished.stageNumber);
    }

    export async function startQuestionnaire(phil: Phil, userId: string, manuallyStartedQuestionnaire: boolean): Promise<boolean> {
        const canStart = await canStartQuestionnaire(phil.db, userId, manuallyStartedQuestionnaire);
        if (!canStart) {
            return false;
        }

        await phil.db.query('DELETE FROM timezones WHERE userid = $1', [userId]);

        const initialStage = (manuallyStartedQuestionnaire ? Stages.Country : Stages.LetsBegin);
        const username = phil.bot.users[userId].username;
        await phil.db.query('INSERT INTO timezones(username, userid, stage) VALUES($1, $2, $3)', [username, userId, initialStage.stageNumber]);

        await QuestionnaireStageUtils.sendStageMessage(phil, userId, initialStage);
        return true;
    }

    export async function getStageForUser(db: Database, userId: string) : Promise<IStage | null> {
        const results = await db.query('SELECT stage FROM timezones WHERE userid = $1 LIMIT 1', [userId]);
        if (results.rowCount !== 1) {
            return null;
        }

        const stageNo = parseInt(results.rows[0].stage, 10);
        return Stages.getFromNumber(stageNo);
    }
}

export default TimezoneQuestionnaire;
