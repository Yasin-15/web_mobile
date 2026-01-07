const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        default: 100
    },
    remarks: {
        type: String,
        trim: true
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure a student only has one mark record for a specific exam/subject/class
markSchema.index({ student: 1, exam: 1, subject: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
