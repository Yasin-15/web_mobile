const Joi = require('joi');

// Common validation patterns
const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    objectId: /^[0-9a-fA-F]{24}$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
    numeric: /^\d+$/,
    decimal: /^\d+(\.\d{1,2})?$/
};

// Base schemas
const baseSchemas = {
    objectId: Joi.string().pattern(patterns.objectId).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(patterns.phone).required(),
    password: Joi.string().pattern(patterns.password).min(8).required(),
    name: Joi.string().min(2).max(50).pattern(patterns.alphanumeric).required(),
    optionalName: Joi.string().min(2).max(50).pattern(patterns.alphanumeric).optional(),
    date: Joi.date().required(),
    optionalDate: Joi.date().optional(),
    amount: Joi.number().positive().precision(2).required(),
    percentage: Joi.number().min(0).max(100).required(),
    grade: Joi.string().valid('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F').required(),
    status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    role: Joi.string().valid('school-admin', 'teacher', 'student', 'parent', 'receptionist').required()
};

// Authentication schemas
const authSchemas = {
    register: Joi.object({
        firstName: baseSchemas.name,
        lastName: baseSchemas.name,
        email: baseSchemas.email,
        password: baseSchemas.password,
        role: baseSchemas.role,
        tenantId: baseSchemas.objectId
    }),

    login: Joi.object({
        email: baseSchemas.email,
        password: Joi.string().required(),
        tenantId: baseSchemas.objectId.optional()
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: baseSchemas.password,
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    }),

    resetPassword: Joi.object({
        email: baseSchemas.email,
        tenantId: baseSchemas.objectId.optional()
    }),

    verifyReset: Joi.object({
        token: Joi.string().required(),
        newPassword: baseSchemas.password,
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    })
};

// User schemas
const userSchemas = {
    createStudent: Joi.object({
        firstName: baseSchemas.name,
        lastName: baseSchemas.name,
        email: baseSchemas.email,
        phone: baseSchemas.phone,
        dateOfBirth: baseSchemas.date,
        gender: baseSchemas.gender,
        bloodGroup: baseSchemas.bloodGroup,
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().default('India')
        }).required(),
        profile: Joi.object({
            admissionNumber: Joi.string().required(),
            admissionDate: baseSchemas.date,
            class: baseSchemas.objectId,
            section: Joi.string().required(),
            rollNumber: Joi.string().required(),
            previousSchool: baseSchemas.optionalName,
            medicalInfo: Joi.object({
                allergies: Joi.array().items(Joi.string()).optional(),
                medications: Joi.array().items(Joi.string()).optional(),
                emergencyContact: Joi.object({
                    name: baseSchemas.name,
                    phone: baseSchemas.phone,
                    relation: Joi.string().required()
                }).required()
            }).optional()
        }).required(),
        parentId: baseSchemas.objectId.optional()
    }),

    updateStudent: Joi.object({
        firstName: baseSchemas.optionalName,
        lastName: baseSchemas.optionalName,
        phone: Joi.string().pattern(patterns.phone).optional(),
        address: Joi.object({
            street: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            zipCode: Joi.string().optional(),
            country: Joi.string().optional()
        }).optional(),
        profile: Joi.object({
            class: baseSchemas.objectId.optional(),
            section: Joi.string().optional(),
            rollNumber: Joi.string().optional(),
            medicalInfo: Joi.object({
                allergies: Joi.array().items(Joi.string()).optional(),
                medications: Joi.array().items(Joi.string()).optional(),
                emergencyContact: Joi.object({
                    name: baseSchemas.optionalName,
                    phone: Joi.string().pattern(patterns.phone).optional(),
                    relation: Joi.string().optional()
                }).optional()
            }).optional()
        }).optional(),
        status: baseSchemas.status.optional()
    }),

    createTeacher: Joi.object({
        firstName: baseSchemas.name,
        lastName: baseSchemas.name,
        email: baseSchemas.email,
        phone: baseSchemas.phone,
        dateOfBirth: baseSchemas.date,
        gender: baseSchemas.gender,
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().default('India')
        }).required(),
        profile: Joi.object({
            employeeId: Joi.string().required(),
            joiningDate: baseSchemas.date,
            qualification: Joi.string().required(),
            experience: Joi.number().min(0).required(),
            subjects: Joi.array().items(baseSchemas.objectId).required(),
            salary: baseSchemas.amount,
            department: Joi.string().required()
        }).required()
    }),

    updateTeacher: Joi.object({
        firstName: baseSchemas.optionalName,
        lastName: baseSchemas.optionalName,
        phone: Joi.string().pattern(patterns.phone).optional(),
        address: Joi.object({
            street: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            zipCode: Joi.string().optional(),
            country: Joi.string().optional()
        }).optional(),
        profile: Joi.object({
            qualification: Joi.string().optional(),
            experience: Joi.number().min(0).optional(),
            subjects: Joi.array().items(baseSchemas.objectId).optional(),
            salary: baseSchemas.amount.optional(),
            department: Joi.string().optional()
        }).optional(),
        status: baseSchemas.status.optional()
    })
};

// Academic schemas
const academicSchemas = {
    createClass: Joi.object({
        name: Joi.string().required(),
        sections: Joi.array().items(Joi.string()).min(1).required(),
        capacity: Joi.number().positive().required(),
        classTeacher: baseSchemas.objectId.optional(),
        subjects: Joi.array().items(baseSchemas.objectId).optional(),
        academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    }),

    createSubject: Joi.object({
        name: Joi.string().required(),
        code: Joi.string().required(),
        description: Joi.string().optional(),
        credits: Joi.number().positive().required(),
        type: Joi.string().valid('core', 'elective', 'practical').required(),
        classes: Joi.array().items(baseSchemas.objectId).optional()
    }),

    createTimetable: Joi.object({
        class: baseSchemas.objectId,
        section: Joi.string().required(),
        day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday').required(),
        periods: Joi.array().items(Joi.object({
            subject: baseSchemas.objectId,
            teacher: baseSchemas.objectId,
            startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            room: Joi.string().optional()
        })).required(),
        academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    }),

    markAttendance: Joi.object({
        class: baseSchemas.objectId,
        section: Joi.string().required(),
        date: baseSchemas.date,
        subject: baseSchemas.objectId.optional(),
        period: Joi.number().positive().optional(),
        students: Joi.array().items(Joi.object({
            student: baseSchemas.objectId,
            status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
            remarks: Joi.string().optional()
        })).required()
    })
};

// Exam and Assessment schemas
const examSchemas = {
    createExam: Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('unit-test', 'mid-term', 'final', 'practical', 'project').required(),
        startDate: baseSchemas.date,
        endDate: baseSchemas.date,
        classes: Joi.array().items(baseSchemas.objectId).required(),
        subjects: Joi.array().items(Joi.object({
            subject: baseSchemas.objectId,
            date: baseSchemas.date,
            startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            duration: Joi.number().positive().required(), // in minutes
            maxMarks: Joi.number().positive().required(),
            passingMarks: Joi.number().positive().required()
        })).required(),
        term: Joi.string().valid('1st', '2nd', '3rd', 'annual').required(),
        academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    }),

    enterMarks: Joi.object({
        exam: baseSchemas.objectId,
        subject: baseSchemas.objectId,
        class: baseSchemas.objectId,
        section: Joi.string().required(),
        marks: Joi.array().items(Joi.object({
            student: baseSchemas.objectId,
            marksObtained: Joi.number().min(0).required(),
            grade: baseSchemas.grade.optional(),
            remarks: Joi.string().optional()
        })).required()
    }),

    createAssignment: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        subject: baseSchemas.objectId,
        class: baseSchemas.objectId,
        section: Joi.string().required(),
        teacher: baseSchemas.objectId,
        dueDate: baseSchemas.date,
        maxMarks: Joi.number().positive().required(),
        instructions: Joi.string().optional(),
        attachments: Joi.array().items(Joi.string()).optional()
    })
};

// Financial schemas
const financeSchemas = {
    createFeeStructure: Joi.object({
        name: Joi.string().required(),
        class: baseSchemas.objectId,
        academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
        fees: Joi.array().items(Joi.object({
            type: Joi.string().valid('tuition', 'admission', 'exam', 'library', 'transport', 'hostel', 'other').required(),
            amount: baseSchemas.amount,
            dueDate: baseSchemas.date,
            isOptional: Joi.boolean().default(false)
        })).required(),
        discounts: Joi.array().items(Joi.object({
            type: Joi.string().required(),
            amount: baseSchemas.amount.optional(),
            percentage: baseSchemas.percentage.optional(),
            criteria: Joi.string().required()
        })).optional()
    }),

    createInvoice: Joi.object({
        student: baseSchemas.objectId,
        feeStructure: baseSchemas.objectId,
        dueDate: baseSchemas.date,
        items: Joi.array().items(Joi.object({
            description: Joi.string().required(),
            amount: baseSchemas.amount,
            discount: Joi.number().min(0).optional()
        })).required(),
        totalAmount: baseSchemas.amount,
        discountAmount: Joi.number().min(0).optional(),
        remarks: Joi.string().optional()
    }),

    recordPayment: Joi.object({
        invoice: baseSchemas.objectId,
        amount: baseSchemas.amount,
        paymentMethod: Joi.string().valid('cash', 'card', 'bank-transfer', 'cheque', 'online').required(),
        transactionId: Joi.string().optional(),
        paymentDate: baseSchemas.date,
        remarks: Joi.string().optional()
    })
};

// Communication schemas
const communicationSchemas = {
    createNotification: Joi.object({
        title: Joi.string().required(),
        message: Joi.string().required(),
        type: Joi.string().valid('general', 'urgent', 'academic', 'fee', 'event', 'holiday').required(),
        recipients: Joi.object({
            roles: Joi.array().items(Joi.string().valid('student', 'teacher', 'parent', 'all')).optional(),
            classes: Joi.array().items(baseSchemas.objectId).optional(),
            individuals: Joi.array().items(baseSchemas.objectId).optional()
        }).required(),
        scheduledFor: baseSchemas.optionalDate,
        expiresAt: baseSchemas.optionalDate,
        attachments: Joi.array().items(Joi.string()).optional()
    }),

    sendMessage: Joi.object({
        to: baseSchemas.objectId,
        subject: Joi.string().required(),
        message: Joi.string().required(),
        type: Joi.string().valid('email', 'sms', 'push').default('email'),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
    })
};

// Validation middleware
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        req.validatedData = value;
        next();
    };
};

// Query parameter validation
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Query validation failed',
                errors
            });
        }

        req.validatedQuery = value;
        next();
    };
};

// Common query schemas
const querySchemas = {
    pagination: Joi.object({
        page: Joi.number().positive().default(1),
        limit: Joi.number().positive().max(100).default(10),
        sort: Joi.string().optional(),
        order: Joi.string().valid('asc', 'desc').default('desc')
    }),

    dateRange: Joi.object({
        startDate: baseSchemas.optionalDate,
        endDate: baseSchemas.optionalDate,
        month: Joi.number().min(1).max(12).optional(),
        year: Joi.number().min(2020).max(2030).optional()
    }),

    search: Joi.object({
        q: Joi.string().min(1).optional(),
        fields: Joi.array().items(Joi.string()).optional()
    })
};

module.exports = {
    patterns,
    baseSchemas,
    authSchemas,
    userSchemas,
    academicSchemas,
    examSchemas,
    financeSchemas,
    communicationSchemas,
    querySchemas,
    validate,
    validateQuery
};