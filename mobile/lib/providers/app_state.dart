import 'package:flutter/material.dart';

class AppState with ChangeNotifier {
  bool _isDarkMode = false;
  int _counter = 0;

  bool get isDarkMode => _isDarkMode;
  int get counter => _counter;

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  void incrementCounter() {
    _counter++;
    notifyListeners();
  }
}
