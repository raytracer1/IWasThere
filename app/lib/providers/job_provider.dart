import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/job.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// State for job polling.
class JobState {
  final Job? job;
  final bool isLoading;
  final String? error;

  JobState({this.job, this.isLoading = false, this.error});

  JobState copyWith({Job? job, bool? isLoading, String? error, bool clearError = false}) {
    return JobState(
      job: job ?? this.job,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Job notifier with polling support.
class JobNotifier extends StateNotifier<JobState> {
  final ApiService _apiService;
  Timer? _pollTimer;

  JobNotifier(this._apiService) : super(JobState());

  /// Start polling for a job's status. Stops when job is terminal.
  void startPolling(String jobId) {
    _pollTimer?.cancel();
    state = JobState(isLoading: true);

    _pollJob(jobId);
    _pollTimer = Timer.periodic(
      Duration(milliseconds: ApiConfig.pollIntervalMs),
      (_) => _pollJob(jobId),
    );
  }

  Future<void> _pollJob(String jobId) async {
    try {
      final response = await _apiService.getJob(jobId);
      if (response.success && response.data != null) {
        final job = response.data!;
        state = JobState(job: job, isLoading: false);

        // Stop polling on terminal states
        if (job.isTerminal) {
          _pollTimer?.cancel();
          _pollTimer = null;
        }
      } else if (response.error != null) {
        state = state.copyWith(error: response.error);
        _pollTimer?.cancel();
        _pollTimer = null;
      }
    } catch (e) {
      // Don't stop polling on transient errors
      state = state.copyWith(error: e.toString());
    }
  }

  /// Fetch a job once (no polling).
  Future<void> fetchJob(String jobId) async {
    state = JobState(isLoading: true);
    try {
      final response = await _apiService.getJob(jobId);
      if (response.success && response.data != null) {
        state = JobState(job: response.data, isLoading: false);
      } else {
        state = JobState(error: response.error ?? 'Job not found', isLoading: false);
      }
    } catch (e) {
      state = JobState(error: e.toString(), isLoading: false);
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

/// Provider for a single job (by jobId). Uses family for parameterized access.
final jobProvider =
    StateNotifierProvider.family<JobNotifier, JobState, String>((ref, jobId) {
  final notifier = JobNotifier(ref.watch(apiServiceProvider));
  // Auto-start polling when first created
  Future.microtask(() => notifier.startPolling(jobId));
  return notifier;
});
