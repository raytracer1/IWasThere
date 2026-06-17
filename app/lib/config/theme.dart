import 'package:flutter/material.dart';

/// Dark theme matching the web app's Tailwind dark mode aesthetic.
class AppTheme {
  static const Color _primaryColor = Color(0xFF7C3AED); // Purple
  static const Color _surfaceColor = Color(0xFF1F1F23);
  static const Color _backgroundColor = Color(0xFF0E0E10);
  static const Color _cardColor = Color(0xFF1A1A1F);
  static const Color _errorColor = Color(0xFFEF4444);
  static const Color _successColor = Color(0xFF22C55E);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: _primaryColor,
      scaffoldBackgroundColor: _backgroundColor,
      colorScheme: const ColorScheme.dark(
        primary: _primaryColor,
        secondary: _primaryColor,
        surface: _surfaceColor,
        error: _errorColor,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: _surfaceColor,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: _cardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _primaryColor,
          side: const BorderSide(color: _primaryColor),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _surfaceColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _primaryColor),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: _surfaceColor,
        selectedColor: _primaryColor,
        labelStyle: const TextStyle(fontSize: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      badgeTheme: BadgeThemeData(
        backgroundColor: _primaryColor,
        textColor: Colors.white,
      ),
    );
  }

  // Category badge colors matching the web app
  static Color categoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'sports':
        return const Color(0xFF3B82F6); // Blue
      case 'music':
        return const Color(0xFFA855F7); // Purple
      case 'movies':
        return const Color(0xFFF59E0B); // Amber
      case 'news':
        return const Color(0xFFEF4444); // Red
      case 'other':
        return const Color(0xFF6B7280); // Gray
      default:
        return _primaryColor;
    }
  }

  // Status badge colors
  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return _successColor;
      case 'processing':
        return const Color(0xFF3B82F6); // Blue
      case 'queued':
        return const Color(0xFFF59E0B); // Amber
      case 'failed':
        return _errorColor;
      case 'active':
        return _successColor;
      case 'draft':
        return const Color(0xFF6B7280); // Gray
      case 'archived':
        return const Color(0xFF6B7280);
      default:
        return _primaryColor;
    }
  }

  static const Color _primaryColorValue = _primaryColor;
  static const Color _surfaceColorValue = _surfaceColor;
  static const Color _backgroundColorValue = _backgroundColor;
  static const Color _cardColorValue = _cardColor;

  static Color get primaryColor => _primaryColorValue;
  static Color get surfaceColor => _surfaceColorValue;
  static Color get backgroundColor => _backgroundColorValue;
  static Color get cardColor => _cardColorValue;
}
