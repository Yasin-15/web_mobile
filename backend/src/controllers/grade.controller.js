const GradeSystem = require('../models/gradeSystem.model');

// Create a new grade system
exports.createGradeSystem = async (req, res) => {
    try {
        const { grades } = req.body;
        const tenantId = req.user.tenantId;

        // Validate that grades don't overlap
        const sortedGrades = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);
        for (let i = 0; i < sortedGrades.length - 1; i++) {
            if (sortedGrades[i].minPercentage <= sortedGrades[i + 1].maxPercentage) {
                return res.status(400).json({
                    success: false,
                    message: 'Grade ranges cannot overlap'
                });
            }
        }

        // Check if an active grade system already exists
        const existingSystem = await GradeSystem.findOne({ tenantId, isActive: true });
        if (existingSystem) {
            return res.status(400).json({
                success: false,
                message: 'An active grade system already exists. Please deactivate it first.'
            });
        }

        const gradeSystem = new GradeSystem({
            tenantId,
            grades: sortedGrades,
            isActive: true
        });

        await gradeSystem.save();

        res.status(201).json({
            success: true,
            message: 'Grade system created successfully',
            data: gradeSystem
        });
    } catch (error) {
        console.error('Error creating grade system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create grade system',
            error: error.message
        });
    }
};

// Get active grade system
exports.getActiveGradeSystem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const gradeSystem = await GradeSystem.findOne({ tenantId, isActive: true });

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'No active grade system found'
            });
        }

        res.status(200).json({
            success: true,
            data: gradeSystem
        });
    } catch (error) {
        console.error('Error fetching active grade system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grade system',
            error: error.message
        });
    }
};

// Get all grade systems (including inactive)
exports.getAllGradeSystems = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const gradeSystems = await GradeSystem.find({ tenantId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: gradeSystems.length,
            data: gradeSystems
        });
    } catch (error) {
        console.error('Error fetching grade systems:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grade systems',
            error: error.message
        });
    }
};

// Get grade system by ID
exports.getGradeSystemById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const gradeSystem = await GradeSystem.findOne({ _id: id, tenantId });

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'Grade system not found'
            });
        }

        res.status(200).json({
            success: true,
            data: gradeSystem
        });
    } catch (error) {
        console.error('Error fetching grade system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grade system',
            error: error.message
        });
    }
};

// Update grade system
exports.updateGradeSystem = async (req, res) => {
    try {
        const { id } = req.params;
        const { grades } = req.body;
        const tenantId = req.user.tenantId;

        // Validate that grades don't overlap
        if (grades) {
            const sortedGrades = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);
            for (let i = 0; i < sortedGrades.length - 1; i++) {
                if (sortedGrades[i].minPercentage <= sortedGrades[i + 1].maxPercentage) {
                    return res.status(400).json({
                        success: false,
                        message: 'Grade ranges cannot overlap'
                    });
                }
            }
            req.body.grades = sortedGrades;
        }

        const gradeSystem = await GradeSystem.findOneAndUpdate(
            { _id: id, tenantId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'Grade system not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Grade system updated successfully',
            data: gradeSystem
        });
    } catch (error) {
        console.error('Error updating grade system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update grade system',
            error: error.message
        });
    }
};

// Delete grade system
exports.deleteGradeSystem = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const gradeSystem = await GradeSystem.findOneAndDelete({ _id: id, tenantId });

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'Grade system not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Grade system deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting grade system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete grade system',
            error: error.message
        });
    }
};

// Activate/Deactivate grade system
exports.toggleGradeSystemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const gradeSystem = await GradeSystem.findOne({ _id: id, tenantId });

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'Grade system not found'
            });
        }

        // If activating, deactivate all other grade systems
        if (!gradeSystem.isActive) {
            await GradeSystem.updateMany(
                { tenantId, isActive: true },
                { isActive: false }
            );
        }

        gradeSystem.isActive = !gradeSystem.isActive;
        await gradeSystem.save();

        res.status(200).json({
            success: true,
            message: `Grade system ${gradeSystem.isActive ? 'activated' : 'deactivated'} successfully`,
            data: gradeSystem
        });
    } catch (error) {
        console.error('Error toggling grade system status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle grade system status',
            error: error.message
        });
    }
};

// Calculate grade from percentage
exports.calculateGrade = async (req, res) => {
    try {
        const { percentage } = req.body;
        const tenantId = req.user.tenantId;

        if (percentage === undefined || percentage === null) {
            return res.status(400).json({
                success: false,
                message: 'Percentage is required'
            });
        }

        const gradeSystem = await GradeSystem.findOne({ tenantId, isActive: true });

        if (!gradeSystem) {
            return res.status(404).json({
                success: false,
                message: 'No active grade system found'
            });
        }

        const gradeInfo = gradeSystem.grades.find(
            g => percentage >= g.minPercentage && percentage <= g.maxPercentage
        );

        if (!gradeInfo) {
            return res.status(404).json({
                success: false,
                message: 'No grade found for the given percentage'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                percentage,
                grade: gradeInfo.grade,
                gpa: gradeInfo.gpa,
                remarks: gradeInfo.remarks
            }
        });
    } catch (error) {
        console.error('Error calculating grade:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate grade',
            error: error.message
        });
    }
};

// Helper function to get grade from percentage (for use in other controllers)
exports.getGradeFromPercentage = async (percentage, tenantId) => {
    try {
        const gradeSystem = await GradeSystem.findOne({ tenantId, isActive: true });

        if (!gradeSystem) {
            return null;
        }

        const gradeInfo = gradeSystem.grades.find(
            g => percentage >= g.minPercentage && percentage <= g.maxPercentage
        );

        return gradeInfo || null;
    } catch (error) {
        console.error('Error getting grade from percentage:', error);
        return null;
    }
};
