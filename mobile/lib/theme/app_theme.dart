import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand color palette matching the Spotify Cyber Violet web theme
  static const Color background = Color(0xFF0C0B10);
  static const Color surface = Color(0xFF15131C);
  static const Color surfaceLight = Color(0xFF201C2B);
  static const Color border = Color(0x1AFFFFFF);

  static const Color accent = Color(0xFF8B5CF6); // Cyber Violet / Electric Purple
  static const Color accentLight = Color(0xFFA78BFA); // Violet 400
  static const Color accentDark = Color(0xFF7C3AED); // Violet 600
  static const Color accentAlpha = Color(0x338B5CF6);

  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  static const Color playerBackground = Color(0xF2120F1A);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: accent,
      colorScheme: const ColorScheme.dark(
        primary: accent,
        secondary: accentLight,
        surface: surface,
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: border, width: 1),
        ),
      ),
    );
  }
}
