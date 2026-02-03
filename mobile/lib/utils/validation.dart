class ValidationUtils {
  static Map<String, dynamic> validateMarkEntry(
    dynamic score,
    dynamic maxMarks,
  ) {
    if (score == null || score.toString().isEmpty) {
      return {'isValid': false, 'message': 'Score is required'};
    }

    double? marksObtained = double.tryParse(score.toString());
    double? max = double.tryParse(maxMarks.toString());

    if (marksObtained == null) {
      return {'isValid': false, 'message': 'Score must be a number'};
    }

    if (marksObtained < 0) {
      return {'isValid': false, 'message': 'Score cannot be negative'};
    }

    if (max != null && marksObtained > max) {
      return {
        'isValid': false,
        'message': 'Score ($marksObtained) cannot exceed max marks ($max)',
      };
    }

    return {'isValid': true, 'message': ''};
  }
}
