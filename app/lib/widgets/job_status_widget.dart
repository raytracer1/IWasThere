import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../config/theme.dart';
import '../models/job.dart';

/// Displays the current job status with appropriate UI for each state.
class JobStatusWidget extends StatelessWidget {
  final Job? job;
  final bool isLoading;
  final String? error;

  const JobStatusWidget({
    super.key,
    this.job,
    this.isLoading = false,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && job == null) {
      return _buildLoadingState();
    }

    if (error != null && job == null) {
      return _buildErrorState();
    }

    if (job == null) {
      return _buildLoadingState();
    }

    switch (job!.status) {
      case 'queued':
        return _buildQueuedState();
      case 'processing':
        return _buildProcessingState();
      case 'completed':
        return _CompletedState(job: job!);
      case 'failed':
        return _buildFailedState();
      default:
        return _buildLoadingState();
    }
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Starting generation...', style: TextStyle(fontSize: 15)),
          SizedBox(height: 6),
          Text(
            'This usually takes 30-60 seconds',
            style: TextStyle(fontSize: 13, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 40),
          ),
          const SizedBox(height: 16),
          const Text(
            'Something went wrong',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
          ),
          if (error != null) ...[
            const SizedBox(height: 8),
            Text(error!, style: const TextStyle(fontSize: 14, color: Colors.white54), textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }

  Widget _buildQueuedState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _AnimatedDots(),
          SizedBox(height: 16),
          Text('Waiting in queue...', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text(
            'Your generation will start shortly',
            style: TextStyle(fontSize: 14, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(strokeWidth: 3),
          ),
          SizedBox(height: 20),
          Text('AI is working magic...', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text(
            'Creating your video • ~30-60s',
            style: TextStyle(fontSize: 14, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildFailedState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('😞', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          const Text(
            'Generation failed',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          if (job?.errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              job!.errorMessage!,
              style: const TextStyle(fontSize: 14, color: Colors.white54),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 8),
          const Text(
            'Try another photo or event',
            style: TextStyle(fontSize: 14, color: Colors.white38),
          ),
        ],
      ),
    );
  }
}

/// Animated dots for "queued" state.
class _AnimatedDots extends StatefulWidget {
  const _AnimatedDots();

  @override
  State<_AnimatedDots> createState() => _AnimatedDotsState();
}

class _AnimatedDotsState extends State<_AnimatedDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        final opacity1 = (_controller.value * 3).clamp(0.0, 1.0);
        final opacity2 = ((_controller.value - 0.15) * 3).clamp(0.0, 1.0);
        final opacity3 = ((_controller.value - 0.3) * 3).clamp(0.0, 1.0);
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _dot(opacity1),
            const SizedBox(width: 6),
            _dot(opacity2),
            const SizedBox(width: 6),
            _dot(opacity3),
          ],
        );
      },
    );
  }

  Widget _dot(double opacity) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppTheme.primaryColor.withValues(alpha: opacity),
      ),
    );
  }
}

/// Completed state with video player, download, and share buttons.
class _CompletedState extends StatefulWidget {
  final Job job;

  const _CompletedState({required this.job});

  @override
  State<_CompletedState> createState() => _CompletedStateState();
}

class _CompletedStateState extends State<_CompletedState> {
  VideoPlayerController? _videoController;
  bool _isDownloading = false;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  void _initVideo() {
    final url = widget.job.outputVideoUrl;
    if (url == null || url.isEmpty) return;

    _videoController = VideoPlayerController.networkUrl(Uri.parse(url))
      ..initialize().then((_) {
        if (mounted) {
          setState(() {});
          _videoController!.setLooping(true);
          _videoController!.play();
        }
      });
  }

  Future<void> _downloadVideo() async {
    final url = widget.job.outputVideoUrl;
    if (url == null || _isDownloading) return;

    setState(() => _isDownloading = true);

    try {
      final dir = await getApplicationDocumentsDirectory();
      final filePath = '${dir.path}/iwasthere_${widget.job.id}.mp4';

      await Dio().download(url, filePath);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Video saved to $filePath'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  Future<void> _shareVideo() async {
    final url = widget.job.outputVideoUrl;
    if (url == null) return;

    try {
      await Share.share(
        'Check out my HotInsert AI video! $url',
        subject: 'My HotInsert AI Creation',
      );
    } catch (_) {}
  }

  Future<void> _copyLink() async {
    final url = widget.job.outputVideoUrl;
    if (url == null) return;

    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link copied to clipboard!')),
      );
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.job.outputVideoUrl;

    return Column(
      children: [
        // Video player
        if (_videoController != null && _videoController!.value.isInitialized)
          AspectRatio(
            aspectRatio: _videoController!.value.aspectRatio,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  VideoPlayer(_videoController!),
                  GestureDetector(
                    onTap: () {
                      if (_videoController!.value.isPlaying) {
                        _videoController!.pause();
                      } else {
                        _videoController!.play();
                      }
                      setState(() {});
                    },
                    child: Container(
                      color: Colors.transparent,
                      child: _videoController!.value.isPlaying
                          ? const SizedBox()
                          : Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.play_arrow, size: 36, color: Colors.white),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          )
        else if (url != null)
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(child: CircularProgressIndicator()),
          ),

        const SizedBox(height: 20),

        // Action buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: _isDownloading ? null : _downloadVideo,
              icon: _isDownloading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.download, size: 20),
              label: Text(_isDownloading ? 'Downloading...' : 'Download'),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _shareVideo,
              icon: const Icon(Icons.share, size: 20),
              label: const Text('Share'),
            ),
            const SizedBox(width: 12),
            IconButton(
              onPressed: _copyLink,
              icon: const Icon(Icons.link, size: 20),
              tooltip: 'Copy link',
              style: IconButton.styleFrom(
                backgroundColor: AppTheme.surfaceColor,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
