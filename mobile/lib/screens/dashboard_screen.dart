import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/teacher_provider.dart';
import '../widgets/theme_toggle_button.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'attendance_screen.dart';
import 'notifications_screen.dart';
import 'assignments/assignment_list_screen.dart';
import 'classes/class_list_screen.dart';
import 'payslips_screen.dart';
import 'certificates/staff_certificates_screen.dart';
import 'students/all_students_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacherProvider = Provider.of<TeacherProvider>(
        context,
        listen: false,
      );
      teacherProvider.fetchDashboardData();
      teacherProvider.initializeListeners();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final teacher = Provider.of<TeacherProvider>(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Faculty Portal',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          ThemeToggleButton(),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => teacher.fetchDashboardData(),
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
                        'Hello, ${user?['firstName'] ?? 'Teacher'}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'Faculty Member',
                        style: TextStyle(color: Colors.blueGrey),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 32),

              const Text(
                'Quick Overview',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.1,
                children: [
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AllStudentsScreen(),
                        ),
                      );
                    },
                    child: _buildStatCard(
                      'Total Students',
                      '${teacher.stats?['totalStudents'] ?? 0}',
                      Icons.people,
                      Colors.blue,
                    ),
                  ),
                  _buildStatCard(
                    'Weekly Hours',
                    '${teacher.stats?['weeklyHours'] ?? 0}h',
                    Icons.alarm,
                    Colors.orange,
                  ),
                  _buildStatCard(
                    'Active Classes',
                    '${teacher.stats?['activeClasses'] ?? 0}',
                    Icons.class_,
                    Colors.green,
                  ),
                  _buildStatCard(
                    'Today\'s Slots',
                    '${teacher.stats?['totalSlots'] ?? 0}',
                    Icons.folder,
                    Colors.purple,
                  ),
                ],
              ),

              const SizedBox(height: 32),
              const Text(
                'Quick Actions',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildActionButton(
                        context,
                        'Classes',
                        Icons.school_outlined,
                        Colors.orange,
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const ClassListScreen(),
                          ),
                        ),
                      ),
                      _buildActionButton(
                        context,
                        'Attendance',
                        Icons.fact_check_outlined,
                        Colors.blue,
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const AttendanceScreen(),
                          ),
                        ),
                      ),
                      _buildActionButton(
                        context,
                        'Homework',
                        Icons.assignment_outlined,
                        Colors.green,
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const AssignmentListScreen(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildActionButton(
                        context,
                        'Payslips',
                        Icons.payments_outlined,
                        Colors.purple,
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const PayslipsScreen(),
                          ),
                        ),
                      ),
                      _buildActionButton(
                        context,
                        'Certificates',
                        Icons.workspace_premium_outlined,
                        Colors.cyan,
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const StaffCertificatesScreen(),
                          ),
                        ),
                      ),
                      // Add an empty space or another action to keep alignment
                      const SizedBox(width: 80),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Today\'s Schedule',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AttendanceScreen(),
                        ),
                      );
                    },
                    child: const Text(
                      'Mark Attendance',
                      style: TextStyle(color: Color(0xFF6366F1)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (teacher.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (teacher.schedule.isEmpty)
                const Center(
                  child: Text(
                    'No classes scheduled for today',
                    style: TextStyle(
                      color: Colors.blueGrey,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                )
              else
                ...teacher.schedule.map(
                  (slot) => _buildScheduleItem(
                    slot['subject']['name'] ?? 'Unknown Subject',
                    '${slot['class']['name']} ${slot['class']['section']}',
                    '${slot['startTime']} - ${slot['endTime']}',
                    slot['room'] ?? 'TBD',
                  ),
                ),

              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Announcements',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      );
                    },
                    child: const Text(
                      'See All',
                      style: TextStyle(color: Color(0xFF6366F1)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (teacher.notifications.isEmpty)
                const Text(
                  'No recent announcements',
                  style: TextStyle(
                    color: Colors.blueGrey,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else
                ...teacher.notifications
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

  Widget _buildActionButton(
    BuildContext context,
    String label,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          Text(
            title,
            style: const TextStyle(color: Colors.blueGrey, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleItem(
    String subject,
    String className,
    String time,
    String room,
  ) {
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
            child: const Icon(Icons.school, color: Color(0xFF6366F1)),
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
                  '$className • $room',
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
