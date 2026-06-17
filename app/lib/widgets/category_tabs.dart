import 'package:flutter/material.dart';
import '../config/theme.dart';

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
    {'key': 'fiction', 'label': 'Fiction', 'icon': Icons.movie},
    {'key': 'history', 'label': 'History', 'icon': Icons.history},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final key = cat['key'] as String?;
          final label = cat['label'] as String;
          final icon = cat['icon'] as IconData;
          final isSelected = selectedCategory == key;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            child: ChoiceChip(
              selected: isSelected,
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    size: 18,
                    color: isSelected ? Colors.white : Colors.white54,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: TextStyle(
                      color: isSelected ? Colors.white : Colors.white54,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              onSelected: (_) => onCategoryChanged(key),
              selectedColor: AppTheme.primaryColor,
              backgroundColor: AppTheme.surfaceColor,
              showCheckmark: false,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: BorderSide(
                  color: isSelected ? AppTheme.primaryColor : Colors.white.withValues(alpha: 0.1),
                  width: isSelected ? 0 : 1,
                ),
              ),
              elevation: isSelected ? 2.0 : null,
              shadowColor: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.3) : null,
            ),
          );
        },
      ),
    );
  }
}
