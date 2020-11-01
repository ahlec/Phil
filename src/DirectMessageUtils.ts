import Phil from './phil';
import SubmissionSession from './prompts/submission-session';
import {
  endQuestionnaire,
  getStageForUser,
  isCurrentlyDoingQuestionnaire,
} from './timezones/questionnaire';

export async function endOngoingDirectMessageProcesses(
  phil: Phil,
  userId: string
): Promise<void> {
  const submissionSession = await SubmissionSession.getActiveSession(
    phil,
    userId
  );
  if (submissionSession) {
    await submissionSession.end();
  }

  const questionnaireStage = await getStageForUser(phil.db, userId);
  if (questionnaireStage && isCurrentlyDoingQuestionnaire(questionnaireStage)) {
    await endQuestionnaire(phil.db, userId);
  }
}
