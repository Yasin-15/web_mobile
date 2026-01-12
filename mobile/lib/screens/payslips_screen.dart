import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class PayslipsScreen extends StatefulWidget {
  const PayslipsScreen({super.key});

  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchMyPayslips();
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
          'My Payslips',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: teacher.isLoading && teacher.payslips.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => teacher.fetchMyPayslips(),
              child: teacher.payslips.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 64,
                            color: Colors.white.withOpacity(0.2),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No payslips found',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(24),
                      itemCount: teacher.payslips.length,
                      itemBuilder: (context, index) {
                        final slip = teacher.payslips[index];
                        return _buildPayslipCard(context, slip);
                      },
                    ),
            ),
    );
  }

  Widget _buildPayslipCard(BuildContext context, dynamic slip) {
    final month = slip['month'] ?? '';
    final year = slip['year'] ?? '';
    final num netSalary = slip['netSalary'] ?? 0;
    final num basicSalary = slip['basicSalary'] ?? 0;
    final status = slip['status'] ?? 'pending';
    final dateRow = slip['createdAt'] != null
        ? DateTime.parse(slip['createdAt'])
        : DateTime.now();

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          title: Text(
            '$month $year',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          subtitle: Text(
            'Processed on ${DateFormat('MMM dd, yyyy').format(dateRow)}',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
            ),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${netSalary.toLocaleString()}',
                style: const TextStyle(
                  color: Color(0xFF10B981),
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 4),
              _buildStatusBadge(status),
            ],
          ),
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.02),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(24),
                ),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    'Basic Salary',
                    '\$${basicSalary.toLocaleString()}',
                  ),
                  const Divider(height: 24, color: Colors.white10),
                  if (slip['allowances'] != null)
                    ...((slip['allowances'] as List).map(
                      (a) => _buildDetailRow(
                        a['name'],
                        '+\$${(a['amount'] as num).toLocaleString()}',
                        color: Colors.greenAccent,
                      ),
                    )),
                  if (slip['deductions'] != null)
                    ...((slip['deductions'] as List).map(
                      (d) => _buildDetailRow(
                        d['name'],
                        '-\$${(d['amount'] as num).toLocaleString()}',
                        color: Colors.redAccent,
                      ),
                    )),
                  const Divider(height: 24, color: Colors.indigoAccent),
                  _buildDetailRow(
                    'Net Payable',
                    '\$${netSalary.toLocaleString()}',
                    isTotal: true,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        // Implement PDF download/view in future
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('PDF generation coming soon!'),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text('Download PDF'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value, {
    Color? color,
    bool isTotal = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isTotal ? Colors.white : Colors.white.withOpacity(0.6),
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color ?? Colors.white,
              fontWeight: isTotal ? FontWeight.w900 : FontWeight.bold,
              fontSize: isTotal ? 16 : 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final isPaid = status.toLowerCase() == 'paid';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: (isPaid ? Colors.green : Colors.orange).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: (isPaid ? Colors.green : Colors.orange).withOpacity(0.2),
        ),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: isPaid ? Colors.green : Colors.orange,
          fontSize: 8,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

extension NumberFormatting on num {
  String toLocaleString() {
    return NumberFormat("#,##0.00", "en_US").format(this);
  }
}
