import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/teacher_provider.dart';

class AddStudentScreen extends StatefulWidget {
  const AddStudentScreen({super.key});

  @override
  State<AddStudentScreen> createState() => _AddStudentScreenState();
}

class _AddStudentScreenState extends State<AddStudentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  String? _selectedClassId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchMyClasses();
    });
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClassId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a class')));
      return;
    }

    final success = await Provider.of<TeacherProvider>(context, listen: false)
        .addStudent({
          'firstName': _firstNameController.text,
          'lastName': _lastNameController.text,
          'email': _emailController.text,
          'password': _passwordController.text,
          'role': 'student',
          'class': _selectedClassId,
        });

    if (mounted && success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Student added successfully')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teacherProvider = Provider.of<TeacherProvider>(context);

    // Filter unique classes just in case
    final classes = teacherProvider.classes;

    return Scaffold(
      appBar: AppBar(title: const Text('Add Student')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'First Name',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Please enter first name' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Last Name',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Please enter last name' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
                obscureText: true,
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Please enter password' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedClassId,
                decoration: const InputDecoration(
                  labelText: 'Class',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.class_),
                ),
                items: classes.map<DropdownMenuItem<String>>((c) {
                  // Handle different id structures if needed (id vs _id)
                  final id = c['_id'] ?? c['id'];
                  final name = c['name'] ?? 'Unknown';
                  final section = c['section'] ?? '';
                  return DropdownMenuItem<String>(
                    value: id,
                    child: Text('$name $section'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedClassId = value;
                  });
                },
                validator: (value) =>
                    value == null ? 'Please select a class' : null,
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: teacherProvider.isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: teacherProvider.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Add Student',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              if (teacherProvider.errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    teacherProvider.errorMessage!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
