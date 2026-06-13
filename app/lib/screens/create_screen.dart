import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import '../config/theme.dart';
import '../models/event.dart';
import '../providers/auth_provider.dart';
import '../widgets/upload_selfie.dart';

/// Create screen — upload selfie and trigger AI generation.
/// Public to browse, login required to generate.
class CreateScreen extends ConsumerStatefulWidget {
  final Event event;

  const CreateScreen({super.key, required this.event});

  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  VideoPlayerController? _videoController;
  String? _videoError;
  File? _selectedFile;
  bool _isUploading = false;
  bool _isGenerating = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  void _initVideo() {
    final url = widget.event.videoUrl;
    print('[CreateScreen] Video URL: $url');
    if (url.isEmpty) {
      print('[CreateScreen] Video URL is empty');
      return;
    }

    _videoController = VideoPlayerController.networkUrl(Uri.parse(url))
      ..initialize().then((_) {
        print('[CreateScreen] Video initialized successfully');
        if (mounted) {
          setState(() {});
          _videoController!.setLooping(true);
          _videoController!.play();
        }
      }).catchError((error) {
        print('[CreateScreen] Video init error: $error');
        _videoError = error.toString();
        if (mounted) setState(() {});
      });
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  bool get _canGenerate {
    final user = ref.read(currentUserProvider);
    return user != null &&
        _selectedFile != null &&
        !_isUploading &&
        !_isGenerating &&
        user.credits >= widget.event.effectivePrice;
  }

  Future<void> _onGenerate() async {
    if (!_canGenerate || _selectedFile == null) return;

    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    final apiService = ref.read(apiServiceProvider);

    try {
      final uploadResponse = await apiService.uploadSelfie(_selectedFile!);
      if (!uploadResponse.success || uploadResponse.data == null) {
        setState(() {
          _isUploading = false;
          _errorMessage = uploadResponse.error ?? 'Upload failed';
        });
        return;
      }

      final imageKey = uploadResponse.data!.key;
      setState(() => _isUploading = false);

      setState(() => _isGenerating = true);
      final swapResponse = await apiService.triggerSwap(
        eventId: widget.event.id,
        imageKey: imageKey,
      );

      if (!swapResponse.success || swapResponse.data == null) {
        setState(() {
          _isGenerating = false;
          _errorMessage = swapResponse.error ?? 'Generation failed';
        });
        return;
      }

      final jobId = swapResponse.data!['jobId'] as String;
      ref.read(authProvider.notifier).refreshCredits();

      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/result', arguments: jobId);
      }
    } catch (e) {
      setState(() {
        _isUploading = false;
        _isGenerating = false;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _goToLogin() async {
    final result = await Navigator.of(context).pushNamed('/login');
    if (result == true && mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final event = widget.event;
    final hasEnoughCredits = user != null && user.credits >= event.effectivePrice;
    final isLoggedIn = user != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(event.title),
        actions: [
          if (isLoggedIn)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                avatar: const Icon(Icons.monetization_on, size: 16, color: Colors.amber),
                label: Text(
                  '\$${user.credits.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Video player (always visible)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: _videoController?.value.aspectRatio ?? 16 / 9,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Initialized video
                    if (_videoController != null && _videoController!.value.isInitialized)
                      GestureDetector(
                        onTap: () {
                          if (_videoController!.value.isPlaying) {
                            _videoController!.pause();
                          } else {
                            _videoController!.play();
                          }
                          setState(() {});
                        },
                        child: VideoPlayer(_videoController!),
                      )
                    // Error state
                    else if (_videoError != null)
                      Container(
                        color: AppTheme.surfaceColor,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, size: 36, color: Colors.red),
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                _videoError!,
                                style: const TextStyle(fontSize: 12, color: Colors.white54),
                                textAlign: TextAlign.center,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      )
                    // Loading state
                    else if (_videoController != null)
                      Container(
                        color: AppTheme.surfaceColor,
                        child: const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(strokeWidth: 2),
                              SizedBox(height: 8),
                              Text('Loading video...', style: TextStyle(fontSize: 13, color: Colors.white54)),
                            ],
                          ),
                        ),
                      )
                    // No video URL
                    else
                      Container(
                        color: AppTheme.surfaceColor,
                        child: const Center(
                          child: Icon(Icons.videocam, size: 48, color: Colors.white24),
                        ),
                      ),
                    // Play button overlay
                    if (_videoController != null &&
                        _videoController!.value.isInitialized &&
                        !_videoController!.value.isPlaying)
                      Container(
                        width: 56,
                        height: 56,
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.play_arrow, size: 32, color: Colors.white),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Event info (always visible)
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppTheme.categoryColor(event.category),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    event.category,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    event.title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            if (event.description != null && event.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                event.description!,
                style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.6)),
              ),
            ],

            const SizedBox(height: 20),

            // ─── Login required section ───
            if (!isLoggedIn) ...[
              _buildLoginPrompt(),
            ] else ...[
              // Price info
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.auto_awesome, size: 16, color: Colors.amber),
                    const SizedBox(width: 8),
                    Text(
                      '\$${event.effectivePrice.toStringAsFixed(2)} per generation',
                      style: const TextStyle(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Upload selfie
              const Text('Your Selfie', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              UploadSelfie(
                selectedFile: _selectedFile,
                uploading: _isUploading,
                disabled: false,
                onFileSelected: (file) => setState(() => _selectedFile = file),
              ),

              const SizedBox(height: 20),

              // Error message
              if (_errorMessage != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ),

              // Generate button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _canGenerate ? _onGenerate : null,
                  icon: _isGenerating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(
                    _isUploading
                        ? 'Uploading...'
                        : _isGenerating
                            ? 'Generating...'
                            : !hasEnoughCredits
                                ? 'Insufficient credits'
                                : 'Generate My Video',
                  ),
                ),
              ),

              const SizedBox(height: 8),

              if (!hasEnoughCredits)
                Center(
                  child: Text(
                    'You need \$${event.effectivePrice.toStringAsFixed(2)} but have \$${user.credits.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, color: Colors.amber),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLoginPrompt() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        color: AppTheme.cardColor,
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.auto_awesome, size: 28, color: AppTheme.primaryColor),
          ),
          const SizedBox(height: 16),
          const Text(
            'Sign in to create your video',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Upload your selfie and AI will insert you into this trending moment.',
            style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.5)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.monetization_on, size: 14, color: Colors.amber),
                const SizedBox(width: 4),
                Text(
                  '\$${widget.event.effectivePrice.toStringAsFixed(2)} per generation',
                  style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _goToLogin,
              icon: const Icon(Icons.login, size: 20),
              label: const Text('Sign in to Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}
