import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Horizontal scrollable category filter tabs.
class CategoryTabs extends StatelessWidget {
  final String? selectedCategory;
  final ValueChanged<String?> onCategoryChanged;

  const CategoryTabs({
    super.key,
    required this.selectedCategory,
    required this.onCategoryChanged,
  });

  static const _categories = [
    {'key': null, 'label': 'All', 'icon': Icons.grid_view},
    {'key': 'sports', 'label': 'Sports', 'icon': Icons.sports_soccer},
    {'key': 'music', 'label': 'Music', 'icon': Icons.music_note},
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final key = cat['key'] as String?;
          final label = cat['label'] as String;
          final icon = cat['icon'] as IconData;
          final isSelected = selectedCategory == key;

          return FilterChip(
            selected: isSelected,
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: isSelected ? Colors.white : Colors.white70),
                const SizedBox(width: 6),
                Text(label),
              ],
            ),
            onSelected: (_) => onCategoryChanged(key),
            selectedColor: AppTheme.primaryColor,
            checkmarkColor: Colors.white,
            backgroundColor: AppTheme.surfaceColor,
            side: BorderSide(
              color: isSelected ? AppTheme.primaryColor : Colors.white.withValues(alpha: 0.12),
            ),
          );
        },
      ),
    );
  }
}
