import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/teacher_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class AttendanceScreen extends StatefulWidget {
  final String? classId;
  const AttendanceScreen({super.key, this.classId});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  String? _selectedClassId;
  final Map<String, String> _attendanceStatus = {}; // studentId -> status

  @override
  void initState() {
    super.initState();
    if (widget.classId != null) {
      _selectedClassId = widget.classId;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacher = Provider.of<TeacherProvider>(context, listen: false);
      teacher.fetchMyClasses();
      if (_selectedClassId != null) {
        teacher.fetchClassStudents(_selectedClassId!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Mark Attendance',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedClassId,
                  hint: const Text(
                    'Select a Class',
                    style: TextStyle(color: Colors.blueGrey),
                  ),
                  isExpanded: true,
                  dropdownColor: const Color(0xFF1E293B),
                  items: teacher.classes.map((c) {
                    return DropdownMenuItem<String>(
                      value: c['_id'].toString(),
                      child: Text(
                        '${c['name']} ${c['section']}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedClassId = val;
                      _attendanceStatus.clear();
                    });
                    if (val != null) {
                      teacher.fetchClassStudents(val);
                      _fetchExistingAttendance(val);
                    }
                  },
                ),
              ),
            ),
          ),
          Expanded(
            child: _selectedClassId == null
                ? const Center(
                    child: Text(
                      'Please select a class to start',
                      style: TextStyle(color: Colors.blueGrey),
                    ),
                  )
                : teacher.isLoading
                ? const Center(child: CircularProgressIndicator())
                : teacher.students.isEmpty
                ? const Center(
                    child: Text(
                      'No students found in this class',
                      style: TextStyle(color: Colors.blueGrey),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: teacher.students.length,
                    itemBuilder: (context, index) {
                      final student = teacher.students[index];
                      final studentId = student['_id'].toString();
                      return _buildStudentItem(student, studentId);
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar:
          _selectedClassId != null && teacher.students.isNotEmpty
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: teacher.isLoading ? null : _submitAttendance,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Submit Attendance',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildStudentItem(Map<String, dynamic> student, String studentId) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${student['firstName']} ${student['lastName']}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  'Roll: ${student['profile']?['rollNo'] ?? 'N/A'}',
                  style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                ),
              ],
            ),
          ),
          Row(
            children: [
              _statusIcon(
                studentId,
                'present',
                Icons.check_circle,
                Colors.green,
              ),
              const SizedBox(width: 8),
              _statusIcon(studentId, 'absent', Icons.cancel, Colors.red),
              const SizedBox(width: 8),
              _statusIcon(
                studentId,
                'late',
                Icons.access_time_filled,
                Colors.orange,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusIcon(
    String studentId,
    String status,
    IconData icon,
    Color color,
  ) {
    final isSelected = (_attendanceStatus[studentId] ?? 'present') == status;
    return GestureDetector(
      onTap: () {
        setState(() {
          _attendanceStatus[studentId] = status;
        });
      },
      child: Icon(
        icon,
        color: isSelected ? color : color.withOpacity(0.2),
        size: 30,
      ),
    );
  }

  void _fetchExistingAttendance(String classId) async {
    final teacher = Provider.of<TeacherProvider>(context, listen: false);
    final today = DateTime.now().toIso8601String().split('T')[0];
    final records = await teacher.fetchClassAttendance(classId, today);

    if (records.isNotEmpty) {
      if (!mounted) return;
      setState(() {
        for (var rec in records) {
          final studentId = rec['student'] is Map
              ? rec['student']['_id']?.toString()
              : rec['student']?.toString();
          if (studentId != null) {
            _attendanceStatus[studentId] = rec['status'] ?? 'present';
          }
        }
      });
    }
  }

  void _submitAttendance() async {
    final teacher = Provider.of<TeacherProvider>(context, listen: false);
    final List<Map<String, dynamic>> data = teacher.students.map((s) {
      final id = s['_id'].toString();
      return {'studentId': id, 'status': _attendanceStatus[id] ?? 'present'};
    }).toList();

    final success = await teacher.markAttendanceBatch(_selectedClassId!, data);
    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Attendance submitted successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to submit attendance.')),
      );
    }
  }
}
