import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

class ConnectivityService with ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  bool _isOnline = true;

  bool get isOnline => _isOnline;

  ConnectivityService() {
    _initConnectivity();
    _connectivity.onConnectivityChanged.listen(_updateConnectionStatus);
  }

  Future<void> _initConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateConnectionStatus(result);
    } catch (e) {
      debugPrint('Connectivity check error: $e');
    }
  }

  void _updateConnectionStatus(List<ConnectivityResult> results) {
    // connectivity_plus now returns a List<ConnectivityResult>
    final result = results.first;
    final isNowOnline = result != ConnectivityResult.none;
    if (_isOnline != isNowOnline) {
      _isOnline = isNowOnline;
      notifyListeners();
      debugPrint(
        'Connection status changed: ${_isOnline ? "Online" : "Offline"}',
      );
    }
  }
}
