import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Flutter Premium App'),
        actions: [
          IconButton(
            icon: Icon(
              appState.isDarkMode ? Icons.light_mode : Icons.dark_mode,
            ),
            onPressed: () {
              context.read<AppState>().toggleTheme();
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Welcome, User!',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, end: 0),

            const SizedBox(height: 16),

            Text(
              'You have pushed the button this many times:',
              style: Theme.of(context).textTheme.bodyLarge,
            ).animate(delay: 200.ms).fadeIn(),

            const SizedBox(height: 8),

            Text(
                  '${appState.counter}',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                )
                .animate(key: ValueKey(appState.counter))
                .scale(duration: 200.ms, curve: Curves.easeOutBack),

            const SizedBox(height: 32),

            CustomButton(
              label: 'Increment',
              icon: Icons.add,
              onPressed: () {
                context.read<AppState>().incrementCounter();
              },
            ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.5, end: 0),
          ],
        ),
      ),
    );
  }
}
