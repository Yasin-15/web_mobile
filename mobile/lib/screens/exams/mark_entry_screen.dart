import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';

class MarkEntryScreen extends StatefulWidget {
  final dynamic exam;
  const MarkEntryScreen({super.key, required this.exam});

  @override
  State<MarkEntryScreen> createState() => _MarkEntryScreenState();
}

class _MarkEntryScreenState extends State<MarkEntryScreen> {
  String? selectedClassId;
  String? selectedSubjectId;
  List<dynamic> classStudents = [];
  Map<String, dynamic> marksData = {}; // studentId: {score, remarks}
  bool isLoadingStudents = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeacherProvider>().fetchMyClasses();
      context.read<TeacherProvider>().fetchSubjects();
    });
  }

  void _loadStudents() async {
    if (selectedClassId == null || selectedSubjectId == null) return;
    setState(() => isLoadingStudents = true);

    final provider = context.read<TeacherProvider>();
    await provider.fetchClassStudents(selectedClassId!);

    // Fetch existing marks
    final marks = await provider.fetchExamMarks(
      widget.exam['_id'],
      selectedSubjectId!,
      selectedClassId!,
    );

    setState(() {
      classStudents = provider.students;
      marksData = {};
      for (var student in classStudents) {
        final existingMark = marks.firstWhere(
          (m) =>
              m['student']['_id'] == student['_id'] ||
              m['student']['id'] == student['_id'],
          orElse: () => null,
        );
        marksData[student['_id']] = {
          'score': existingMark != null
              ? existingMark['marksObtained'].toString()
              : '',
          'remarks': existingMark != null ? existingMark['remarks'] ?? '' : '',
        };
      }
      isLoadingStudents = false;
    });
  }

  void _saveMarks() async {
    final List<Map<String, dynamic>> finalMarks = [];
    marksData.forEach((studentId, data) {
      if (data['score'].toString().isNotEmpty) {
        finalMarks.add({
          'studentId': studentId,
          'score': double.tryParse(data['score'].toString()) ?? 0,
          'remarks': data['remarks'] ?? '',
        });
      }
    });

    if (finalMarks.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No marks entered')));
      return;
    }

    final success = await context.read<TeacherProvider>().saveMarks(
      widget.exam['_id'],
      selectedSubjectId!,
      selectedClassId!,
      finalMarks,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Marks saved successfully' : 'Failed to save marks',
          ),
        ),
      );
      if (success) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<TeacherProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Grading: ${widget.exam['name']}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: selectedClassId,
                    hint: const Text(
                      'Class',
                      style: TextStyle(color: Colors.white54),
                    ),
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    items: provider.classes.map((c) {
                      return DropdownMenuItem<String>(
                        value: c['_id'] ?? c['id'],
                        child: Text('${c['name']} - ${c['section']}'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => selectedClassId = val);
                      _loadStudents();
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: selectedSubjectId,
                    hint: const Text(
                      'Subject',
                      style: TextStyle(color: Colors.white54),
                    ),
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    items: provider.subjects.map((s) {
                      return DropdownMenuItem<String>(
                        value: s['_id'] ?? s['id'],
                        child: Text(s['name']),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => selectedSubjectId = val);
                      _loadStudents();
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: isLoadingStudents
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                  )
                : classStudents.isEmpty
                ? const Center(
                    child: Text(
                      'Select class and subject',
                      style: TextStyle(color: Colors.white54),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: classStudents.length,
                    itemBuilder: (context, index) {
                      final student = classStudents[index];
                      final sid = student['_id'];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: Text(
                                '${student['firstName']} ${student['lastName']}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                keyboardType: TextInputType.number,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                                decoration: InputDecoration(
                                  hintText: 'Score',
                                  hintStyle: const TextStyle(
                                    color: Colors.white24,
                                    fontSize: 12,
                                  ),
                                  fillColor: Colors.white.withOpacity(0.05),
                                  filled: true,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                controller:
                                    TextEditingController(
                                        text: marksData[sid]['score'],
                                      )
                                      ..selection = TextSelection.fromPosition(
                                        TextPosition(
                                          offset:
                                              marksData[sid]['score'].length,
                                        ),
                                      ),
                                onChanged: (val) =>
                                    marksData[sid]['score'] = val,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          if (classStudents.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(20),
              child: ElevatedButton(
                onPressed: _saveMarks,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 55),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: provider.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'Save Grade Book',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
