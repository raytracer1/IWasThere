import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/job.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// State for the history screen.
class HistoryState {
  final List<JobWithEvent> jobs;
  final bool isLoading;
  final String? error;
  final int page;
  final int total;
  final bool hasMore;

  HistoryState({
    this.jobs = const [],
    this.isLoading = false,
    this.error,
    this.page = 1,
    this.total = 0,
    this.hasMore = true,
  });

  HistoryState copyWith({
    List<JobWithEvent>? jobs,
    bool? isLoading,
    String? error,
    int? page,
    int? total,
    bool? hasMore,
    bool clearError = false,
  }) {
    return HistoryState(
      jobs: jobs ?? this.jobs,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      page: page ?? this.page,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// History notifier — manages paginated generation history.
class HistoryNotifier extends StateNotifier<HistoryState> {
  final ApiService _apiService;

  HistoryNotifier(this._apiService) : super(HistoryState());

  /// Load initial history.
  Future<void> loadHistory() async {
    state = HistoryState(isLoading: true);

    try {
      final response = await _apiService.getHistory(page: 1);
      if (response.success) {
        state = state.copyWith(
          jobs: response.data,
          isLoading: false,
          page: 1,
          total: response.total,
          hasMore: response.data.length < response.total,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.error ?? 'Failed to load history',
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Load next page.
  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;

    final nextPage = state.page + 1;
    state = state.copyWith(isLoading: true);

    try {
      final response = await _apiService.getHistory(page: nextPage);
      if (response.success) {
        state = state.copyWith(
          jobs: [...state.jobs, ...response.data],
          isLoading: false,
          page: nextPage,
          total: response.total,
          hasMore: state.jobs.length + response.data.length < response.total,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }
}

final historyProvider =
    StateNotifierProvider<HistoryNotifier, HistoryState>((ref) {
  return HistoryNotifier(ref.watch(apiServiceProvider));
});
