import 'package:flutter/material.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../dashboard_screen.dart';
import '../student_dashboard_screen.dart';
import '../parent/parent_dashboard_screen.dart';
import 'menu_screen.dart';

class ZoomDrawerScreen extends StatefulWidget {
  const ZoomDrawerScreen({super.key});

  @override
  State<ZoomDrawerScreen> createState() => _ZoomDrawerScreenState();
}

class _ZoomDrawerScreenState extends State<ZoomDrawerScreen> {
  final _drawerController = ZoomDrawerController();
  late Widget _currentScreen;

  @override
  void initState() {
    super.initState();
    // Initialize with the correct dashboard based on role
    _currentScreen = _getInitialScreen();
  }

  Widget _getInitialScreen() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final role = auth.user?['role'];

    if (role == 'student') {
      return const StudentDashboardScreen();
    } else if (role == 'teacher') {
      return const DashboardScreen();
    } else if (role == 'parent') {
      return ParentDashboardScreen();
    }
    return const DashboardScreen();
  }

  @override
  Widget build(BuildContext context) {
    return ZoomDrawer(
      controller: _drawerController,
      menuScreen: MenuScreen(
        onMenuItemSelected: (screen) {
          setState(() {
            _currentScreen = screen;
          });
          _drawerController.close?.call();
        },
      ),
      mainScreen: _currentScreen,
      borderRadius: 24.0,
      showShadow: true,
      angle: 0.1,
      drawerShadowsBackgroundColor: Colors.grey.withOpacity(0.3),
      slideWidth: MediaQuery.of(context).size.width * 0.75,
      menuBackgroundColor: const Color(0xFF1E1E2D),
      mainScreenScale: 0.4,
    );
  }
}
