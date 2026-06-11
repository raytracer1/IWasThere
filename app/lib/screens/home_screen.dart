import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/events_provider.dart';
import '../widgets/category_tabs.dart';
import '../widgets/event_card.dart';

/// Home screen — trending events grid with category filtering.
/// Public — no login required for browsing.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(eventsProvider.notifier).loadEvents();
      // Try silent session restore (doesn't block UI)
      ref.read(authProvider.notifier).tryRestoreSession();
    });

    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(eventsProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _signOut() async {
    await ref.read(authProvider.notifier).signOut();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final eventsState = ref.watch(eventsProvider);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('HotInsert AI', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          if (user != null) ...[
            // Credits display
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Chip(
                avatar: const Icon(Icons.monetization_on, size: 16, color: Colors.amber),
                label: Text(
                  '\$${user.credits.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                backgroundColor: Colors.amber.withValues(alpha: 0.1),
              ),
            ),
            // User menu
            PopupMenuButton<String>(
              onSelected: (value) async {
                if (value == 'logout') {
                  await _signOut();
                } else if (value == 'history') {
                  Navigator.of(context).pushNamed('/history');
                } else if (value == 'admin' && user.isAdmin) {
                  Navigator.of(context).pushNamed('/admin');
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'history', child: Text('History')),
                if (user.isAdmin)
                  const PopupMenuItem(value: 'admin', child: Text('Admin Panel')),
                const PopupMenuItem(value: 'logout', child: Text('Sign Out')),
              ],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.primaryColor,
                  child: Text(
                    (user.name?.isNotEmpty == true ? user.name![0] : user.email[0]).toUpperCase(),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
      body: Column(
        children: [
          CategoryTabs(
            selectedCategory: eventsState.selectedCategory,
            onCategoryChanged: (category) {
              ref.read(eventsProvider.notifier).loadEvents(category: category);
            },
          ),
          const SizedBox(height: 8),
          Expanded(child: _buildContent(eventsState)),
        ],
      ),
    );
  }

  Widget _buildContent(EventsState state) {
    if (state.isLoading && state.events.isEmpty) {
      return _buildShimmerGrid();
    }

    if (state.error != null && state.events.isEmpty) {
      return _buildError(state.error!);
    }

    if (state.events.isEmpty) {
      return _buildEmpty();
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(eventsProvider.notifier).loadEvents(
            category: state.selectedCategory,
          ),
      child: GridView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.75,
        ),
        itemCount: state.events.length + (state.isLoading ? 4 : 0),
        itemBuilder: (context, index) {
          if (index >= state.events.length) {
            return _buildShimmerCard();
          }
          final event = state.events[index];
          return EventCard(
            event: event,
            onTap: () => Navigator.of(context).pushNamed('/create', arguments: event),
          );
        },
      ),
    );
  }

  Widget _buildShimmerGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => _buildShimmerCard(),
    );
  }

  Widget _buildShimmerCard() {
    return Shimmer.fromColors(
      baseColor: Colors.white.withValues(alpha: 0.05),
      highlightColor: Colors.white.withValues(alpha: 0.1),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.cardColor,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.cloud_off, size: 48, color: Colors.red),
            ),
            const SizedBox(height: 16),
            Text(
              error,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(eventsProvider.notifier).loadEvents(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎬', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            const Text(
              'No events yet',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Check back soon for trending events!',
              style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.5)),
            ),
          ],
        ),
      ),
    );
  }
}
