// Validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  objectId: /^[0-9a-fA-F]{24}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  academicYear: /^\d{4}-\d{4}$/,
  indianPhone: /^[6-9]\d{9}$/,
  pincode: /^[1-9][0-9]{5}$/
};

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Base validation functions
export const validators = {
  required: (value: any, fieldName: string): ValidationError | null => {
    if (value === null || value === undefined || value === '') {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  email: (value: string, fieldName: string = 'Email'): ValidationError | null => {
    if (!value) return null;
    if (!patterns.email.test(value)) {
      return { field: fieldName, message: 'Please enter a valid email address' };
    }
    return null;
  },

  phone: (value: string, fieldName: string = 'Phone'): ValidationError | null => {
    if (!value) return null;
    if (!patterns.indianPhone.test(value)) {
      return { field: fieldName, message: 'Please enter a valid 10-digit phone number' };
    }
    return null;
  },

  password: (value: string, fieldName: string = 'Password'): ValidationError | null => {
    if (!value) return null;
    if (value.length < 8) {
      return { field: fieldName, message: 'Password must be at least 8 characters long' };
    }
    if (!patterns.password.test(value)) {
      return { 
        field: fieldName, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      };
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (!value) return null;
    if (value.length < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min} characters long` };
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
    if (!value) return null;
    if (value.length > max) {
      return { field: fieldName, message: `${fieldName} must not exceed ${max} characters` };
    }
    return null;
  },

  numeric: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    if (!patterns.numeric.test(value)) {
      return { field: fieldName, message: `${fieldName} must contain only numbers` };
    }
    return null;
  },

  decimal: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    if (!patterns.decimal.test(value)) {
      return { field: fieldName, message: `${fieldName} must be a valid decimal number` };
    }
    return null;
  },

  positiveNumber: (value: number, fieldName: string): ValidationError | null => {
    if (value === null || value === undefined) return null;
    if (value <= 0) {
      return { field: fieldName, message: `${fieldName} must be a positive number` };
    }
    return null;
  },

  dateRange: (startDate: Date, endDate: Date, fieldName: string = 'Date range'): ValidationError | null => {
    if (!startDate || !endDate) return null;
    if (startDate >= endDate) {
      return { field: fieldName, message: 'Start date must be before end date' };
    }
    return null;
  },

  futureDate: (date: Date, fieldName: string): ValidationError | null => {
    if (!date) return null;
    if (date <= new Date()) {
      return { field: fieldName, message: `${fieldName} must be a future date` };
    }
    return null;
  },

  pastDate: (date: Date, fieldName: string): ValidationError | null => {
    if (!date) return null;
    if (date >= new Date()) {
      return { field: fieldName, message: `${fieldName} must be a past date` };
    }
    return null;
  },

  time: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    if (!patterns.time.test(value)) {
      return { field: fieldName, message: `${fieldName} must be in HH:MM format` };
    }
    return null;
  },

  timeRange: (startTime: string, endTime: string, fieldName: string = 'Time range'): ValidationError | null => {
    if (!startTime || !endTime) return null;
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (start >= end) {
      return { field: fieldName, message: 'Start time must be before end time' };
    }
    return null;
  },

  academicYear: (value: string, fieldName: string = 'Academic Year'): ValidationError | null => {
    if (!value) return null;
    if (!patterns.academicYear.test(value)) {
      return { field: fieldName, message: 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)' };
    }
    const [startYear, endYear] = value.split('-').map(Number);
    if (endYear !== startYear + 1) {
      return { field: fieldName, message: 'End year must be exactly one year after start year' };
    }
    return null;
  },

  percentage: (value: number, fieldName: string): ValidationError | null => {
    if (value === null || value === undefined) return null;
    if (value < 0 || value > 100) {
      return { field: fieldName, message: `${fieldName} must be between 0 and 100` };
    }
    return null;
  },

  grade: (value: string, fieldName: string = 'Grade'): ValidationError | null => {
    if (!value) return null;
    const validGrades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
    if (!validGrades.includes(value)) {
      return { field: fieldName, message: 'Please select a valid grade' };
    }
    return null;
  },

  bloodGroup: (value: string, fieldName: string = 'Blood Group'): ValidationError | null => {
    if (!value) return null;
    const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validGroups.includes(value)) {
      return { field: fieldName, message: 'Please select a valid blood group' };
    }
    return null;
  },

  pincode: (value: string, fieldName: string = 'Pincode'): ValidationError | null => {
    if (!value) return null;
    if (!patterns.pincode.test(value)) {
      return { field: fieldName, message: 'Please enter a valid 6-digit pincode' };
    }
    return null;
  },

  confirmPassword: (password: string, confirmPassword: string): ValidationError | null => {
    if (!confirmPassword) return null;
    if (password !== confirmPassword) {
      return { field: 'confirmPassword', message: 'Passwords do not match' };
    }
    return null;
  },

  fileSize: (file: File, maxSizeMB: number, fieldName: string = 'File'): ValidationError | null => {
    if (!file) return null;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { field: fieldName, message: `File size must not exceed ${maxSizeMB}MB` };
    }
    return null;
  },

  fileType: (file: File, allowedTypes: string[], fieldName: string = 'File'): ValidationError | null => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) {
      return { field: fieldName, message: `File type must be one of: ${allowedTypes.join(', ')}` };
    }
    return null;
  }
};

// Form validation schemas
export const formSchemas = {
  login: {
    email: [validators.required, validators.email],
    password: [validators.required]
  },

  register: {
    firstName: [validators.required, (v: string) => validators.minLength(v, 2, 'First Name')],
    lastName: [validators.required, (v: string) => validators.minLength(v, 2, 'Last Name')],
    email: [validators.required, validators.email],
    password: [validators.required, validators.password],
    confirmPassword: [validators.required],
    role: [validators.required]
  },

  student: {
    firstName: [validators.required, (v: string) => validators.minLength(v, 2, 'First Name')],
    lastName: [validators.required, (v: string) => validators.minLength(v, 2, 'Last Name')],
    email: [validators.required, validators.email],
    phone: [validators.required, validators.phone],
    dateOfBirth: [validators.required],
    gender: [validators.required],
    admissionNumber: [validators.required],
    admissionDate: [validators.required],
    class: [validators.required],
    section: [validators.required],
    rollNumber: [validators.required],
    address: {
      street: [validators.required],
      city: [validators.required],
      state: [validators.required],
      zipCode: [validators.required, validators.pincode],
      country: [validators.required]
    }
  },

  teacher: {
    firstName: [validators.required, (v: string) => validators.minLength(v, 2, 'First Name')],
    lastName: [validators.required, (v: string) => validators.minLength(v, 2, 'Last Name')],
    email: [validators.required, validators.email],
    phone: [validators.required, validators.phone],
    dateOfBirth: [validators.required],
    gender: [validators.required],
    employeeId: [validators.required],
    joiningDate: [validators.required],
    qualification: [validators.required],
    experience: [validators.required, (v: number) => validators.positiveNumber(v, 'Experience')],
    subjects: [validators.required],
    salary: [validators.required, (v: number) => validators.positiveNumber(v, 'Salary')],
    department: [validators.required]
  },

  exam: {
    name: [validators.required],
    type: [validators.required],
    startDate: [validators.required],
    endDate: [validators.required],
    classes: [validators.required],
    subjects: [validators.required],
    term: [validators.required],
    academicYear: [validators.required, validators.academicYear]
  },

  assignment: {
    title: [validators.required],
    description: [validators.required],
    subject: [validators.required],
    class: [validators.required],
    section: [validators.required],
    dueDate: [validators.required],
    maxMarks: [validators.required, (v: number) => validators.positiveNumber(v, 'Maximum Marks')]
  },

  fee: {
    name: [validators.required],
    class: [validators.required],
    academicYear: [validators.required, validators.academicYear],
    fees: [validators.required]
  },

  payment: {
    amount: [validators.required, (v: number) => validators.positiveNumber(v, 'Amount')],
    paymentMethod: [validators.required],
    paymentDate: [validators.required]
  },

  notification: {
    title: [validators.required],
    message: [validators.required],
    type: [validators.required],
    recipients: [validators.required]
  }
};

// Main validation function
export const validateForm = (data: any, schema: any): ValidationResult => {
  const errors: ValidationError[] = [];

  const validateField = (value: any, fieldValidators: any[], fieldPath: string) => {
    for (const validator of fieldValidators) {
      if (typeof validator === 'function') {
        const error = validator(value, fieldPath);
        if (error) {
          errors.push(error);
          break; // Stop at first error for this field
        }
      }
    }
  };

  const validateObject = (obj: any, schemaObj: any, prefix: string = '') => {
    for (const [key, validators] of Object.entries(schemaObj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const value = obj?.[key];

      if (Array.isArray(validators)) {
        validateField(value, validators, fieldPath);
      } else if (typeof validators === 'object') {
        validateObject(value, validators, fieldPath);
      }
    }
  };

  validateObject(data, schema);

  // Special validations
  if (schema.confirmPassword && data.password && data.confirmPassword) {
    const error = validators.confirmPassword(data.password, data.confirmPassword);
    if (error) errors.push(error);
  }

  if (schema.startDate && schema.endDate && data.startDate && data.endDate) {
    const error = validators.dateRange(new Date(data.startDate), new Date(data.endDate));
    if (error) errors.push(error);
  }

  if (schema.startTime && schema.endTime && data.startTime && data.endTime) {
    const error = validators.timeRange(data.startTime, data.endTime);
    if (error) errors.push(error);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Real-time validation hook
export const useFormValidation = (initialData: any, schema: any) => {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateField = (fieldName: string, value: any) => {
    const fieldSchema = getNestedValue(schema, fieldName);
    if (!fieldSchema) return;

    const fieldErrors = errors.filter(e => e.field !== fieldName);
    const result = validateForm({ [fieldName]: value }, { [fieldName]: fieldSchema });
    
    setErrors([...fieldErrors, ...result.errors]);
  };

  const handleChange = (fieldName: string, value: any) => {
    setData((prev: any) => setNestedValue(prev, fieldName, value));
    
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, getNestedValue(data, fieldName));
  };

  const validateAll = () => {
    const result = validateForm(data, schema);
    setErrors(result.errors);
    return result.isValid;
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(e => e.field === fieldName)?.message;
  };

  const hasFieldError = (fieldName: string) => {
    return errors.some(e => e.field === fieldName);
  };

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
    hasFieldError,
    isValid: errors.length === 0
  };
};

// Utility functions
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
  return { ...obj };
};

// Export React import for the hook
import React from 'react';