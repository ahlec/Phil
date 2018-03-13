'use strict';

import { Analyzer, IAnalyzerLookup } from './@types';
import { TimezoneQuestionnaireAnalyzer } from './timezone-questionnaire';

export const AnalyzerLookup : IAnalyzerLookup = {};

function registerAnalyzer(analyzer : Analyzer) {
    AnalyzerLookup[analyzer.handle] = analyzer;
}

registerAnalyzer(new TimezoneQuestionnaireAnalyzer());
