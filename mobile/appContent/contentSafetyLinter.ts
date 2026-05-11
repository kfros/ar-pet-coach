import { FORBIDDEN_TERMS } from './routineSafety';

export interface LintResult {
    forbiddenTerm: string;
    location: string;
    suggestedReplacement?: string;
}

export const lintContent = (content: string, location: string): LintResult[] => {
    const results: LintResult[] = [];
    const lowerContent = content.toLowerCase();

    FORBIDDEN_TERMS.forEach(term => {
        // Use word boundaries \b to avoid partial matches (like "treats" for "treat")
        // Except if the term itself ends with a space (our manual fix)
        const escapedTerm = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
        
        if (regex.test(content)) {
            results.push({
                forbiddenTerm: term,
                location
            });
        }
    });

    return results;
};

export const lintRoutine = (routine: any): LintResult[] => {
    let results: LintResult[] = [];

    results = [...results, ...lintContent(routine.title, `${routine.id}:title`)];
    results = [...results, ...lintContent(routine.subtitle || routine.description || '', `${routine.id}:subtitle/description`)];
    
    if (routine.steps) {
        routine.steps.forEach((step: any, index: number) => {
            results = [...results, ...lintContent(step.title, `${routine.id}:step[${index}]:title`)];
            results = [...results, ...lintContent(step.instruction || step.body || '', `${routine.id}:step[${index}]:body`)];
        });
    }

    if (routine.beforeYouStart) {
        routine.beforeYouStart.forEach((note: string, index: number) => {
            results = [...results, ...lintContent(note, `${routine.id}:beforeYouStart[${index}]`)];
        });
    }

    if (routine.safetyNotes) {
        routine.safetyNotes.forEach((note: string, index: number) => {
            results = [...results, ...lintContent(note, `${routine.id}:safetyNotes[${index}]`)];
        });
    }

    return results;
};
