import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/student_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'notifications_screen.dart';
import 'assignments/student_assignment_list_screen.dart';
import 'attendance/student_attendance_screen.dart';
import 'timetable/student_timetable_screen.dart';
import 'exams/student_exams_screen.dart';
import 'student/student_fees_screen.dart';
import 'login_screen.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final user = auth.user;
      String? classId;
      if (user != null &&
          user['profile'] != null &&
          user['profile']['class'] != null) {
        classId = user['profile']['class'];
      }

      final provider = Provider.of<StudentProvider>(context, listen: false);
      provider.fetchDashboardData(classId);
      provider.fetchAssignments();
      provider.fetchExams();
      provider.fetchCertificates();
      provider.fetchStudentGrades();
      provider.initializeListeners(classId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final studentProvider = Provider.of<StudentProvider>(context);
    final user = auth.user;

    final now = DateTime.now();
    final todaysSchedule = studentProvider.timetable.where((slot) {
      final slotDay = slot['day']?.toString().toLowerCase();
      return slotDay == _getDayName(now.weekday).toLowerCase();
    }).toList();

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Student Portal',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.logout();
              if (context.mounted) {
                Provider.of<StudentProvider>(context, listen: false).clear();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          String? classId;
          if (user != null && user['profile'] != null) {
            classId = user['profile']['class'];
          }
          await studentProvider.fetchDashboardData(classId);
          await studentProvider.fetchStudentGrades();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFF6366F1).withOpacity(0.1),
                    child: Text(
                      '${user?['firstName']?[0] ?? ''}${user?['lastName']?[0] ?? ''}',
                      style: const TextStyle(
                        color: Color(0xFF6366F1),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello, ${user?['firstName'] ?? 'Student'}!',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Class: ${user?['profile']?['class'] ?? ''}${user?['profile']?['section'] != null ? ' - ${user?['profile']['section']}' : ''}',
                        style: const TextStyle(color: Colors.blueGrey),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 32),
              const Text(
                'Quick Actions',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _buildQuickActions(context),
              const SizedBox(height: 32),
              const Text(
                'Academic Overview',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _buildAcademicCard(studentProvider),
              const SizedBox(height: 32),
              const Text(
                'Today\'s Schedule',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              if (studentProvider.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (todaysSchedule.isEmpty)
                const Center(
                  child: Text(
                    'No classes for today',
                    style: TextStyle(
                      color: Colors.blueGrey,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                )
              else
                ...todaysSchedule.map(
                  (slot) => _buildScheduleItem(
                    slot['subject'] is Map
                        ? (slot['subject']['name'] ?? 'Subject')
                        : 'Subject',
                    '${slot['startTime']} - ${slot['endTime']}',
                    slot['room'] ?? 'TBD',
                  ),
                ),
              const SizedBox(height: 32),
              if (studentProvider.assignments.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Assignments Due',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const StudentAssignmentListScreen(),
                        ),
                      ),
                      child: const Text(
                        'See All',
                        style: TextStyle(color: Color(0xFF6366F1)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ...studentProvider.assignments
                    .take(2)
                    .map((assignment) => _buildAssignmentItem(assignment)),
                const SizedBox(height: 32),
              ],
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Announcements',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const NotificationsScreen(),
                      ),
                    ),
                    child: const Text(
                      'See All',
                      style: TextStyle(color: Color(0xFF6366F1)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (studentProvider.notifications.isEmpty)
                const Text(
                  'No recent announcements',
                  style: TextStyle(
                    color: Colors.blueGrey,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else
                ...studentProvider.notifications
                    .take(3)
                    .map(
                      (notif) => _buildNotificationItem(
                        notif['title'] ?? 'No Title',
                        notif['message'] ?? '',
                        notif['createdAt'] ?? '',
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildActionItem(
          context,
          'Attendance',
          Icons.calendar_today,
          const Color(0xFF3B82F6),
          const StudentAttendanceScreen(),
        ),
        _buildActionItem(
          context,
          'Timetable',
          Icons.calendar_month,
          const Color(0xFF8B5CF6),
          const StudentTimetableScreen(),
        ),
        _buildActionItem(
          context,
          'Exams',
          Icons.assignment_turned_in,
          const Color(0xFFF59E0B),
          const StudentExamsScreen(),
        ),
        _buildActionItem(
          context,
          'Fees',
          Icons.account_balance_wallet,
          const Color(0xFF10B981),
          const StudentFeesScreen(),
        ),
      ],
    );
  }

  Widget _buildActionItem(
    BuildContext context,
    String label,
    IconData icon,
    Color color,
    Widget screen,
  ) {
    return Column(
      children: [
        InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => screen),
          ),
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(icon, color: color),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.blueGrey,
          ),
        ),
      ],
    );
  }

  Widget _buildAcademicCard(StudentProvider provider) {
    final stats = provider.attendanceStats;
    final percentage = stats?['percentage'] ?? '0';

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF3B82F6).withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ATTENDANCE',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$percentage%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF8B5CF6),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF8B5CF6).withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AVG GRADE',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  provider.studentGrades?['cumulativeGpa']?.toString() ?? 'N/A',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _getDayName(int weekday) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1];
  }

  Widget _buildScheduleItem(String subject, String time, String room) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.book, color: Color(0xFF6366F1)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  'Room $room',
                  style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: const TextStyle(
              color: Color(0xFF6366F1),
              fontWeight: FontWeight.bold,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAssignmentItem(dynamic assignment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF43F5E).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.assignment,
              color: Color(0xFFF43F5E),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  assignment['title'] ?? 'Assignment',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Due: ${assignment['dueDate']?.toString().split('T')[0] ?? 'No Date'}',
                  style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(String title, String message, String date) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
