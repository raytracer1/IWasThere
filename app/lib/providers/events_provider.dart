import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/event.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// State for the events list screen.
class EventsState {
  static const _sentinel = Object();

  final List<Event> events;
  final bool isLoading;
  final String? error;
  final String? selectedCategory;
  final int page;
  final int total;
  final bool hasMore;

  EventsState({
    this.events = const [],
    this.isLoading = false,
    this.error,
    this.selectedCategory,
    this.page = 1,
    this.total = 0,
    this.hasMore = true,
  });

  EventsState copyWith({
    List<Event>? events,
    bool? isLoading,
    String? error,
    Object? selectedCategory = _sentinel,
    int? page,
    int? total,
    bool? hasMore,
    bool clearError = false,
  }) {
    return EventsState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      selectedCategory: selectedCategory != _sentinel ? selectedCategory as String? : this.selectedCategory,
      page: page ?? this.page,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// Events notifier — manages event browsing with category filtering.
class EventsNotifier extends StateNotifier<EventsState> {
  final ApiService _apiService;

  EventsNotifier(this._apiService) : super(EventsState());

  /// Load events (initial load or category change).
  Future<void> loadEvents({String? category}) async {
    final isCategoryChange = category != state.selectedCategory;

    state = state.copyWith(
      isLoading: true,
      error: null,
      selectedCategory: category,
      events: isCategoryChange ? [] : state.events,
      page: 1,
      hasMore: true,
    );

    try {
      final response = await _apiService.getEvents(category: category);
      if (response.success) {
        state = state.copyWith(
          events: response.data,
          isLoading: false,
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
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load more events (pagination).
  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;

    final nextPage = state.page + 1;
    state = state.copyWith(isLoading: true);

    try {
      final response = await _apiService.getEvents(
        category: state.selectedCategory,
        page: nextPage,
      );
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
}

final eventsProvider =
    StateNotifierProvider<EventsNotifier, EventsState>((ref) {
  return EventsNotifier(ref.watch(apiServiceProvider));
});
