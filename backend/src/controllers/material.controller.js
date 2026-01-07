const Material = require('../models/material.model');

// @desc    Create new learning material
// @route   POST /api/materials
// @access  Private (Teacher, Admin)
exports.createMaterial = async (req, res) => {
    try {
        const { title, description, type, content, fileUrl, classId, subjectId } = req.body;

        const material = await Material.create({
            tenantId: req.user.tenantId,
            title,
            description,
            type,
            content,
            fileUrl,
            class: classId,
            subject: subjectId,
            teacher: req.user._id
        });

        res.status(201).json({ success: true, data: material });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
exports.getMaterials = async (req, res) => {
    try {
        const query = { tenantId: req.user.tenantId };

        // If teacher, show materials they created
        if (req.user.role === 'teacher') {
            query.teacher = req.user._id;
        }
        // If student, filter by their class
        else if (req.user.role === 'student' && req.user.profile?.class) {
            // Need to handle class lookup if stored as string in profile
            // For now assume query params handle it or teacher id
            query.visibleToStudents = true;
        }

        // Apply filters from query params
        if (req.query.classId) query.class = req.query.classId;
        if (req.query.subjectId) query.subject = req.query.subjectId;

        const materials = await Material.find(query)
            .populate('class', 'name section')
            .populate('subject', 'name')
            .populate('teacher', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: materials.length, data: materials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private (Teacher, Admin)
exports.updateMaterial = async (req, res) => {
    try {
        let material = await Material.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        // Check ownership
        if (material.teacher.toString() !== req.user._id.toString() && req.user.role !== 'school-admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        material = await Material.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: material });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private (Teacher, Admin)
exports.deleteMaterial = async (req, res) => {
    try {
        const material = await Material.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        // Check ownership
        if (material.teacher.toString() !== req.user._id.toString() && req.user.role !== 'school-admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await material.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
