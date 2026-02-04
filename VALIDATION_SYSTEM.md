# Validation System Documentation

## Overview
A comprehensive validation system has been implemented across the entire application (Backend, Frontend, and Mobile) to ensure data integrity and provide consistent error handling.

## Backend Validation

### Validation Utilities (`backend/src/utils/validation.js`)
- **`validate(schema)`**: Generic validation middleware factory for request body validation
- **`validateQuery(schema)`**: Validation middleware for query parameters
- **`validateMarkEntry(score, maxMarks)`**: Validates mark entries
- **`isValidObjectId(id)`**: Validates MongoDB ObjectId format
- **`isValidEmail(email)`**: Validates email format
- **`isValidPhone(phone)`**: Validates phone number format

### Validation Middleware (`backend/src/middlewares/validation.middleware.js`)
Custom validation middleware functions:
- **`validateObjectId(paramName)`**: Validates route parameter ObjectIds
- **`validateDateRange`**: Validates date ranges
- **`validateFileUpload(allowedTypes, maxSize)`**: Validates file uploads
- **`validateAcademicYear`**: Validates academic year format (YYYY-YYYY)
- **`validateTimeSlot`**: Validates time format and range
- **`validateMarks`**: Validates marks entry arrays
- **`validatePayment`**: Validates payment data
- **`validateBulkOperation(maxItems)`**: Validates bulk operations
- **`handleValidationError`**: Global error handler for validation errors

### Validation Schemas (`backend/src/utils/validationSchemas.js`)
Pre-defined validation schemas for common entities:
- `contactMessageSchema`: Contact form validation
- `studentSchema`: Student creation/update validation
- `examSchema`: Exam creation/update validation
- `markEntrySchema`: Mark entry validation
- `bulkMarkEntrySchema`: Bulk mark entry validation
- `feePaymentSchema`: Fee payment validation
- `timetableSchema`: Timetable slot validation

### Routes with Validation
The following routes now have validation middleware applied:

#### Contact Messages (`/api/contact-messages`)
- POST `/`: Validates contact message data
- GET `/:id`: Validates ObjectId parameter
- PATCH `/:id`: Validates ObjectId parameter
- DELETE `/:id`: Validates ObjectId parameter

#### Exams (`/api/exams`)
- POST `/`: Validates exam data
- PUT `/:id`: Validates ObjectId parameter
- POST `/marks/bulk`: Validates bulk mark entry data and marks values
- DELETE `/marks/:markId`: Validates ObjectId parameter
- GET `/report/:examId/:studentId`: Validates ObjectId parameters
- GET `/analytics/:examId`: Validates ObjectId parameter
- GET `/top-performers/:examId/:classId`: Validates ObjectId parameters

#### Students (`/api/students`)
- POST `/`: Validates student data
- POST `/promote`: Validates bulk operation
- POST `/bulk-import`: Validates bulk operation
- GET `/:id`: Validates ObjectId parameter
- PUT `/:id`: Validates ObjectId parameter
- DELETE `/:id`: Validates ObjectId parameter
- POST `/:id/reset-password`: Validates ObjectId parameter

### Error Response Format
All validation errors follow a consistent format:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error message",
      "value": "invalid value"
    }
  ]
}
```

## Frontend Validation

### Validation Utilities (`frontend/src/utils/validation.ts`)
- **`validateMarkEntry(score, maxMarks)`**: Validates mark entries
- **`validateEmail(email)`**: Validates email format
- **`validateRequired(value, fieldName)`**: Validates required fields
- **`validateLength(value, minLength, maxLength, fieldName)`**: Validates string length
- **`validateObjectId(id, fieldName)`**: Validates ObjectId format
- **`validatePhone(phone)`**: Validates phone number format
- **`validateNumberRange(value, min, max, fieldName)`**: Validates number ranges
- **`validateDateRange(startDate, endDate)`**: Validates date ranges
- **`validateContactMessage(data)`**: Validates contact form data
- **`validateExam(data)`**: Validates exam form data
- **`validateStudent(data)`**: Validates student form data

### Validation Components
- **`ValidationMessage`**: Component for displaying validation errors (`frontend/src/components/ui/ValidationMessage.tsx`)

### Contact Form Integration
The contact form (`frontend/src/app/contact/page.tsx`) now includes:
- Client-side validation before submission
- API validation error handling
- Field-level error display
- Visual feedback for invalid fields

## Mobile Validation

### Validation Utilities (`mobile/lib/utils/validation.dart`)
Dart classes and methods matching backend validation:
- **`ValidationUtils.validateMarkEntry()`**: Validates mark entries
- **`ValidationUtils.validateEmail()`**: Validates email format
- **`ValidationUtils.validateRequired()`**: Validates required fields
- **`ValidationUtils.validateLength()`**: Validates string length
- **`ValidationUtils.validateObjectId()`**: Validates ObjectId format
- **`ValidationUtils.validatePhone()`**: Validates phone number format
- **`ValidationUtils.validateNumberRange()`**: Validates number ranges
- **`ValidationUtils.validateDateRange()`**: Validates date ranges
- **`ValidationUtils.validateContactMessage()`**: Validates contact form data
- **`ValidationUtils.validateExam()`**: Validates exam form data
- **`ValidationUtils.validateStudent()`**: Validates student form data

### Data Classes
- **`ValidationError`**: Represents a validation error with field, message, and value
- **`ValidationResult`**: Represents validation result with isValid flag, message, and errors array

## Validation Flow

1. **Client-Side Validation** (Frontend/Mobile)
   - Validates data before sending to API
   - Provides immediate feedback to users
   - Reduces unnecessary API calls

2. **Server-Side Validation** (Backend)
   - Validates all incoming data
   - Ensures data integrity
   - Returns structured error responses

3. **Error Handling**
   - Validation errors are caught by `handleValidationError` middleware
   - Errors are formatted consistently
   - Frontend/Mobile display errors appropriately

## Usage Examples

### Backend Route Validation
```javascript
const { validate, validateObjectId } = require('../middlewares/validation.middleware');
const { contactMessageSchema } = require('../utils/validationSchemas');

router.post('/', validate(contactMessageSchema), createContactMessage);
router.get('/:id', validateObjectId('id'), getContactMessageById);
```

### Frontend Form Validation
```typescript
import { validateContactMessage } from '@/utils/validation';

const validationResult = validateContactMessage(formData);
if (!validationResult.isValid) {
  setValidationErrors(validationResult.errors || []);
  return;
}
```

### Mobile Form Validation
```dart
import 'package:your_app/utils/validation.dart';

final result = ValidationUtils.validateContactMessage(
  firstName: firstName,
  lastName: lastName,
  email: email,
  message: message,
);

if (!result.isValid) {
  // Handle errors
  print(result.message);
  if (result.errors != null) {
    for (var error in result.errors!) {
      print('${error.field}: ${error.message}');
    }
  }
}
```

## Benefits

1. **Consistency**: Same validation rules across all platforms
2. **Data Integrity**: Server-side validation ensures data quality
3. **User Experience**: Client-side validation provides immediate feedback
4. **Error Handling**: Structured error responses for better error display
5. **Maintainability**: Centralized validation schemas and utilities
6. **Security**: Prevents invalid data from reaching the database

## Future Enhancements

- Add more validation schemas for other entities (teachers, classes, etc.)
- Implement validation for file uploads in frontend
- Add real-time validation feedback in forms
- Create validation rules builder for dynamic schemas
- Add validation tests for all schemas
