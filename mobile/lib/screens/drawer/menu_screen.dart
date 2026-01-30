import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../dashboard_screen.dart';
import '../attendance_screen.dart';
import '../assignments/assignment_list_screen.dart';
import '../exams/teacher_exams_screen.dart';
import '../timetable/teacher_timetable_screen.dart';
import '../lms/material_list_screen.dart';
import '../payslips_screen.dart';
import '../profile_screen.dart';
import '../notifications_screen.dart';
import '../student_dashboard_screen.dart';
import '../assignments/student_assignment_list_screen.dart';
import '../timetable/student_timetable_screen.dart';
import '../attendance/student_attendance_screen.dart';
import '../exams/student_exams_screen.dart';
import '../materials/student_materials_screen.dart';
import '../student/student_certificates_screen.dart';
import '../exams/student_grades_screen.dart';
import '../student/student_fees_screen.dart';
import '../login_screen.dart';
import '../parent/parent_dashboard_screen.dart';
import '../certificates/staff_certificates_screen.dart';

class MenuItem {
  final String title;
  final IconData icon;
  final Widget screen;

  MenuItem(this.title, this.icon, this.screen);
}

class MenuScreen extends StatelessWidget {
  final Function(Widget) onMenuItemSelected;

  const MenuScreen({super.key, required this.onMenuItemSelected});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final role = user?['role'];

    final List<MenuItem> menuItems = _getMenuItems(role);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E1E2D), Color(0xFF2D2D44)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: CircleAvatar(
                        radius: 40,
                        backgroundColor: const Color(0xFF6366F1),
                        child: Text(
                          '${user?['firstName']?[0] ?? ''}',
                          style: const TextStyle(
                            fontSize: 32,
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '${user?['firstName'] ?? ''} ${user?['lastName'] ?? ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      (user?['role'] ?? '').toString().toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF6366F1),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: menuItems.length,
                  itemBuilder: (context, index) {
                    final item = menuItems[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: ListTile(
                        leading: Icon(
                          item.icon,
                          color: Colors.white.withOpacity(0.7),
                          size: 22,
                        ),
                        title: Text(
                          item.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        onTap: () => onMenuItemSelected(item.screen),
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: ListTile(
                  leading: const Icon(
                    Icons.logout_rounded,
                    color: Color(0xFFF43F5E),
                  ),
                  title: const Text(
                    'Logout',
                    style: TextStyle(
                      color: Color(0xFFF43F5E),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () async {
                    await auth.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                        (route) => false,
                      );
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<MenuItem> _getMenuItems(String? role) {
    if (role == 'teacher') {
      return [
        MenuItem('Dashboard', Icons.dashboard, const DashboardScreen()),
        MenuItem('Attendance', Icons.calendar_today, const AttendanceScreen()),
        MenuItem('Assignments', Icons.assignment, const AssignmentListScreen()),
        MenuItem('Exams', Icons.grade, const TeacherExamsScreen()),
        MenuItem(
          'Timetable',
          Icons.calendar_month,
          const TeacherTimetableScreen(),
        ),
        MenuItem(
          'LMS Materials',
          Icons.library_books,
          const MaterialListScreen(),
        ),
        MenuItem(
          'Certificates',
          Icons.workspace_premium,
          const StaffCertificatesScreen(),
        ),
        MenuItem('Payslips', Icons.receipt_long, const PayslipsScreen()),

        MenuItem('Profile', Icons.person, const ProfileScreen()),
        MenuItem(
          'Notifications',
          Icons.notifications,
          const NotificationsScreen(),
        ),
      ];
    } else if (role == 'student') {
      return [
        MenuItem('Dashboard', Icons.dashboard, const StudentDashboardScreen()),
        MenuItem(
          'Assignments',
          Icons.assignment,
          const StudentAssignmentListScreen(),
        ),
        MenuItem(
          'Timetable',
          Icons.calendar_today,
          const StudentTimetableScreen(),
        ),
        MenuItem(
          'Attendance',
          Icons.check_circle_outline,
          const StudentAttendanceScreen(),
        ),
        MenuItem(
          'Exams',
          Icons.assignment_turned_in,
          const StudentExamsScreen(),
        ),
        MenuItem('Grades', Icons.grade, const StudentGradesScreen()),
        MenuItem(
          'Materials',
          Icons.library_books,
          const StudentMaterialsScreen(),
        ),
        MenuItem(
          'Certificates',
          Icons.workspace_premium,
          const StudentCertificatesScreen(),
        ),
        MenuItem(
          'Fees',
          Icons.account_balance_wallet_outlined,
          const StudentFeesScreen(),
        ),
        MenuItem('Profile', Icons.person, const ProfileScreen()),
        MenuItem(
          'Notifications',
          Icons.notifications,
          const NotificationsScreen(),
        ),
      ];
    } else if (role == 'parent') {
      return [
        MenuItem('Dashboard', Icons.dashboard, const ParentDashboardScreen()),
        MenuItem('Profile', Icons.person, const ProfileScreen()),
        MenuItem(
          'Notifications',
          Icons.notifications,
          const NotificationsScreen(),
        ),
      ];
    }
    return [];
  }
}
