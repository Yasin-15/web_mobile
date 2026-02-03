/**
 * Validates a mark entry.
 * @param {number} score - The marks obtained.
 * @param {number} maxMarks - The maximum possible marks.
 * @returns {object} - { isValid: boolean, message: string }
 */
const validateMarkEntry = (score, maxMarks) => {
    if (score === undefined || score === null || score === '') {
        return { isValid: false, message: 'Score is required' };
    }

    const marksObtained = Number(score);
    const max = Number(maxMarks);

    if (isNaN(marksObtained)) {
        return { isValid: false, message: 'Score must be a number' };
    }

    if (marksObtained < 0) {
        return { isValid: false, message: 'Score cannot be negative' };
    }

    if (marksObtained > max) {
        return { isValid: false, message: `Score (${marksObtained}) cannot exceed max marks (${max})` };
    }

    return { isValid: true, message: '' };
};

module.exports = {
    validateMarkEntry
};