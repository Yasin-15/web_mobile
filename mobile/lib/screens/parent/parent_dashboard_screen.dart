import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/parent_provider.dart';
import '../../providers/auth_provider.dart';
import '../login_screen.dart';
import '../profile_screen.dart';

class ParentDashboardScreen extends StatefulWidget {
  @override
  _ParentDashboardScreenState createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () =>
          Provider.of<ParentProvider>(context, listen: false).fetchMyChildren(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final parentProvider = Provider.of<ParentProvider>(context);
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      backgroundColor: Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Parent Portal',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 24,
              ),
            ),
            Text(
              'Welcome, ${user?['firstName']}',
              style: TextStyle(color: Colors.blueGrey, fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.person_outline, color: Colors.indigoAccent),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              );
            },
          ),
          IconButton(
            icon: Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
              if (context.mounted) {
                Provider.of<ParentProvider>(context, listen: false).clear();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
          ),
          SizedBox(width: 8),
        ],
      ),
      body: parentProvider.isLoading
          ? Center(child: CircularProgressIndicator(color: Colors.indigoAccent))
          : RefreshIndicator(
              onRefresh: () => parentProvider.fetchMyChildren(),
              child: SingleChildScrollView(
                physics: AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildQuickAlerts(),
                    SizedBox(height: 30),
                    Text(
                      'My Children',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    ...parentProvider.children
                        .map((child) => _buildChildCard(child))
                        .toList(),
                    if (parentProvider.children.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Text(
                            'No linked children found.',
                            style: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildQuickAlerts() {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigoAccent, Colors.indigo.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow:
            [
                  Shadow(
                    color: Colors.indigoAccent.withOpacity(0.3),
                    blurRadius: 20,
                    offset: Offset(0, 10),
                  ),
                ]
                .map(
                  (s) => BoxShadow(
                    color: s.color,
                    blurRadius: s.blurRadius,
                    offset: s.offset,
                  ),
                )
                .toList(),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'All systems go!',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Your children have 0 pending alerts today.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.verified_user, color: Colors.white, size: 40),
        ],
      ),
    );
  }

  Widget _buildChildCard(dynamic child) {
    return Container(
      margin: EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showChildActions(child),
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.indigoAccent.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      child?['firstName']?[0] ?? 'C',
                      style: TextStyle(
                        color: Colors.indigoAccent,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${child['firstName']} ${child['lastName']}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Class ${child['profile']?['class'] ?? 'N/A'} - ${child['profile']?['section'] ?? ''}',
                        style: TextStyle(color: Colors.blueGrey, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Colors.blueGrey),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showChildActions(dynamic child) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Color(0xFF0F172A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.indigoAccent,
                  child: Text(
                    child['firstName'][0],
                    style: TextStyle(color: Colors.white),
                  ),
                ),
                SizedBox(width: 16),
                Text(
                  '${child['firstName']}\'s Progress',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            SizedBox(height: 24),
            _buildActionItem(
              Icons.calendar_today_rounded,
              'Attendance History',
              Colors.greenAccent,
            ),
            _buildActionItem(
              Icons.analytics_rounded,
              'Academic Reports',
              Colors.indigoAccent,
            ),
            _buildActionItem(
              Icons.timer_rounded,
              'Class Timetable',
              Colors.amberAccent,
            ),
            _buildActionItem(
              Icons.chat_bubble_rounded,
              'Contact Teacher',
              Colors.pinkAccent,
            ),
            SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String title, Color color) {
    return ListTile(
      leading: Container(
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      ),
      trailing: Icon(Icons.arrow_forward_ios, color: Colors.blueGrey, size: 14),
      onTap: () {
        Navigator.pop(context);
        // Implement navigation to specifics
      },
    );
  }
}
