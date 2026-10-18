import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:audio_service/audio_service.dart';
import 'theme/app_theme.dart';
import 'services/audio_player_handler.dart';
import 'screens/main_shell.dart';

late AudioPlayerHandler _audioHandler;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system navigation and status bar style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppTheme.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Initialize Native Android Background Audio Service
  _audioHandler = await AudioService.init(
    builder: () => AudioPlayerHandler(),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.seeder.player.channel.audio',
      androidNotificationChannelName: 'Seeder Music Playback',
      androidNotificationChannelDescription: 'Active background playback for Seeder Music Player',
      androidNotificationIcon: 'drawable/ic_stat_music_note',
      androidShowNotificationBadge: true,
      androidStopForegroundOnPause: false, // Ensures notification doesn't vanish on pause
    ),
  );

  runApp(SeederMobileApp(audioHandler: _audioHandler));
}

class SeederMobileApp extends StatelessWidget {
  final AudioPlayerHandler audioHandler;

  const SeederMobileApp({Key? key, required this.audioHandler}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Seeder Music',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: MainShell(audioHandler: audioHandler),
    );
  }
}
