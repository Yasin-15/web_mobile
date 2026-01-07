const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a class name'],
        trim: true
    },
    section: {
        type: String,
        required: [true, 'Please add a section'],
        trim: true
    },
    room: {
        type: String,
        trim: true
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    subjects: [{
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },
        teachers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }]
}, {
    timestamps: true
});

// Ensure class name + section is unique per tenant
classSchema.index({ name: 1, section: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
