const Certificate = require('../models/certificate.model');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Issue a new certificate
// @route   POST /api/certificates
// @access  Private (Admin, Teacher)
exports.issueCertificate = catchAsync(async (req, res, next) => {
    const { studentId, certificateType, title, description, metadata } = req.body;

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
        return next(new AppError('Student not found', 404));
    }

    const certificate = await Certificate.create({
        student: studentId,
        tenantId: req.user.tenantId,
        certificateType,
        title,
        description,
        issuer: req.user._id,
        metadata
    });

    res.status(201).json({
        status: 'success',
        data: {
            certificate
        }
    });
});

// @desc    Get all certificates for a tenant
// @route   GET /api/certificates
// @access  Private (Admin, Teacher)
exports.getAllCertificates = catchAsync(async (req, res, next) => {
    const certificates = await Certificate.find({ tenantId: req.user.tenantId })
        .populate('student', 'firstName lastName admissionNumber')
        .populate('issuer', 'firstName lastName')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: certificates.length,
        data: {
            certificates
        }
    });
});

// @desc    Get current student's certificates
// @route   GET /api/certificates/my
// @access  Private (Student)
exports.getMyCertificates = catchAsync(async (req, res, next) => {
    const certificates = await Certificate.find({
        student: req.user._id,
        status: 'active'
    })
        .populate('student', 'firstName lastName admissionNumber')
        .populate('issuer', 'firstName lastName')
        .sort('-issueDate');

    res.status(200).json({
        status: 'success',
        results: certificates.length,
        data: {
            certificates
        }
    });
});

// @desc    Get student's certificates by student ID
// @route   GET /api/certificates/student/:studentId
// @access  Private (Admin, Teacher, Parent)
exports.getStudentCertificates = catchAsync(async (req, res, next) => {
    const certificates = await Certificate.find({
        student: req.params.studentId,
        tenantId: req.user.tenantId
    })
        .populate('student', 'firstName lastName admissionNumber')
        .populate('issuer', 'firstName lastName')
        .sort('-issueDate');

    res.status(200).json({
        status: 'success',
        results: certificates.length,
        data: {
            certificates
        }
    });
});

// @desc    Verify a certificate by verification code
// @route   GET /api/certificates/verify/:code
// @access  Public
exports.verifyCertificate = catchAsync(async (req, res, next) => {
    const certificate = await Certificate.findOne({
        verificationCode: req.params.code.toUpperCase()
    })
        .populate('student', 'firstName lastName');

    if (!certificate) {
        return next(new AppError('Invalid certificate verification code', 404));
    }

    const tenant = await Tenant.findOne({ tenantId: certificate.tenantId });

    res.status(200).json({
        status: 'success',
        data: {
            isValid: true,
            certificate: {
                title: certificate.title,
                studentName: `${certificate.student.firstName} ${certificate.student.lastName}`,
                schoolName: tenant ? tenant.name : 'Unknown Institution',
                issueDate: certificate.issueDate,
                type: certificate.certificateType,
                status: certificate.status
            }
        }
    });
});

// @desc    Revoke a certificate
// @route   PATCH /api/certificates/:id/revoke
// @access  Private (Admin)
exports.revokeCertificate = catchAsync(async (req, res, next) => {
    const certificate = await Certificate.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        { status: 'revoked' },
        { new: true }
    );


    if (!certificate) {
        return next(new AppError('Certificate not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            certificate
        }
    });
});

// @desc    Update a certificate
// @route   PATCH /api/certificates/:id
// @access  Private (Admin, Teacher)
exports.updateCertificate = catchAsync(async (req, res, next) => {
    const certificate = await Certificate.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        req.body,
        { new: true, runValidators: true }
    );

    if (!certificate) {
        return next(new AppError('Certificate not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            certificate
        }
    });
});

// @desc    Delete a certificate
// @route   DELETE /api/certificates/:id
// @access  Private (Admin)
exports.deleteCertificate = catchAsync(async (req, res, next) => {
    const certificate = await Certificate.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.user.tenantId
    });

    if (!certificate) {
        return next(new AppError('Certificate not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
