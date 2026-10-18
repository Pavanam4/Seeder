import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand color palette matching the Spotify-inspired web dark mode
  static const Color background = Color(0xFF0F0F12);
  static const Color surface = Color(0xFF18181C);
  static const Color surfaceLight = Color(0xFF222228);
  static const Color border = Color(0x1FFFFFFF);

  static const Color accent = Color(0xFFF59E0B); // Amber 500
  static const Color accentLight = Color(0xFFFBBF24); // Amber 400
  static const Color accentAlpha = Color(0x33F59E0B);

  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  static const Color playerBackground = Color(0xEE121216);

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
