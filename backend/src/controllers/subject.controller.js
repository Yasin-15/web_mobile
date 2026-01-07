const Subject = require('../models/subject.model');
const { logAction } = require('../utils/logger');

// @desc    Create a new subject
// @route   POST /api/subjects
exports.createSubject = async (req, res) => {
    try {
        const { name, code, type } = req.body;
        const tenantId = req.user.tenantId;

        const subjectExists = await Subject.findOne({ code, tenantId });
        if (subjectExists) {
            return res.status(400).json({ message: 'Subject with this code already exists' });
        }

        const subject = await Subject.create({
            name,
            code,
            type,
            tenantId,
            teachers: req.body.teachers || []
        });

        await logAction({
            action: 'CREATE',
            module: 'SUBJECT',
            details: `Created subject: ${name} (${code})`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all subjects for current tenant
// @route   GET /api/subjects
exports.getSubjects = async (req, res) => {
    try {
        const query = { tenantId: req.user.tenantId };

        // If requested, only show subjects assigned to the teacher in the timetable
        if (req.user.role === 'teacher' && req.query.assignedOnly === 'true') {
            const Timetable = require('../models/timetable.model');
            const slots = await Timetable.find({ teacher: req.user._id, tenantId: req.user.tenantId });
            const subjectIds = slots.map(s => s.subject.toString());
            query._id = { $in: subjectIds };
        }

        const subjects = await Subject.find(query)
            .populate('teachers', 'firstName lastName email')
            .sort({ name: 1 });
        res.status(200).json({ success: true, count: subjects.length, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update subject
exports.updateSubject = async (req, res) => {
    try {
        let subject = await Subject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        await logAction({
            action: 'UPDATE',
            module: 'SUBJECT',
            details: `Updated subject: ${subject.name}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete subject
exports.deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        await Subject.deleteOne({ _id: req.params.id });

        await logAction({
            action: 'DELETE',
            module: 'SUBJECT',
            details: `Deleted subject: ${subject.name}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add resource to subject
// @route   POST /api/subjects/:id/resources
exports.addResource = async (req, res) => {
    try {
        const { title, url, type } = req.body;
        const subject = await Subject.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            { $push: { resources: { title, url, type } } },
            { new: true }
        );
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        res.status(200).json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove resource from subject
// @route   DELETE /api/subjects/:id/resources/:resourceId
exports.removeResource = async (req, res) => {
    try {
        const subject = await Subject.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            { $pull: { resources: { _id: req.params.resourceId } } },
            { new: true }
        );
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        res.status(200).json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
