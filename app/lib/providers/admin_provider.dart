import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/event.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// State for the admin screen.
class AdminState {
  final List<Event> events;
  final bool isLoading;
  final String? error;
  final int page;
  final int total;
  final bool hasMore;

  AdminState({
    this.events = const [],
    this.isLoading = false,
    this.error,
    this.page = 1,
    this.total = 0,
    this.hasMore = true,
  });

  AdminState copyWith({
    List<Event>? events,
    bool? isLoading,
    String? error,
    int? page,
    int? total,
    bool? hasMore,
    bool clearError = false,
  }) {
    return AdminState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      page: page ?? this.page,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// Admin notifier — manages event CRUD for admin panel.
class AdminNotifier extends StateNotifier<AdminState> {
  final ApiService _apiService;

  AdminNotifier(this._apiService) : super(AdminState());

  /// Load all events (including drafts).
  Future<void> loadEvents() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiService.getAdminEvents(page: 1);
      if (response.success) {
        state = state.copyWith(
          events: response.data,
          isLoading: false,
          page: 1,
          total: response.total,
          hasMore: response.data.length < response.total,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.error ?? 'Failed to load events',
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
      final response = await _apiService.getAdminEvents(page: nextPage);
      if (response.success) {
        state = state.copyWith(
          events: [...state.events, ...response.data],
          isLoading: false,
          page: nextPage,
          total: response.total,
          hasMore: state.events.length + response.data.length < response.total,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  /// Refresh events list after create/edit/delete.
  Future<void> refresh() async {
    state = state.copyWith(page: 1, hasMore: true);
    await loadEvents();
  }
}

final adminProvider =
    StateNotifierProvider<AdminNotifier, AdminState>((ref) {
  return AdminNotifier(ref.watch(apiServiceProvider));
});
