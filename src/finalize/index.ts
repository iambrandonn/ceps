export {
  parseAnswers,
  parseAnswersFromFile,
  ingestAnswers,
  type AnswerEntry,
  type AnswerParseResult,
  type AnswerParseError,
  type AnswerParseOptions,
  type AnswerIngestionReport,
  type AnswerIngestionOptions,
  type InvalidAnswerEntry
} from './answers.js';

export {
  computeImpactReport,
  type ImpactScopeOptions,
  type ImpactReport
} from './impact-scope.js';
