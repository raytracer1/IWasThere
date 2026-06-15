import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../providers/job_provider.dart';

class ResultScreen extends ConsumerWidget {
  final String generationId;
  const ResultScreen({super.key, required this.generationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobState = ref.watch(jobProvider(generationId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Creation'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushReplacementNamed('/home'),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Event info
            if (jobState.job?.eventTitle != null) ...[
              Text(jobState.job!.eventTitle!, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
            ],

            // Content
            Expanded(
              child: _buildContent(jobState),
            ),

            // Actions
            if (jobState.job?.isTerminal == true) ...[
              const SizedBox(height: 16),
              if (jobState.job!.isCompleted)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).pushReplacementNamed('/home'),
                    icon: const Icon(Icons.home, size: 18),
                    label: const Text('Back to Events'),
                  ),
                ),
              if (jobState.job!.isFailed)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).pushReplacementNamed('/home'),
                    icon: const Icon(Icons.home, size: 18),
                    label: const Text('Back to Events'),
                  ),
                ),
              const SizedBox(height: 20),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildContent(JobState state) {
    if (state.isLoading && state.job == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.job == null) {
      return const Center(child: Text('Loading...'));
    }

    if (state.job!.isProcessing || state.job!.isQueued) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 3)),
          const SizedBox(height: 20),
          const Text('Creating your image...', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 8),
          Text('This usually takes 10-20 seconds', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.5))),
        ]),
      );
    }

    if (state.job!.isFailed) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          const Text('Generation failed', style: TextStyle(fontSize: 16)),
          if (state.job!.errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(state.job!.errorMessage!, style: const TextStyle(fontSize: 13, color: Colors.white54), textAlign: TextAlign.center),
          ],
        ]),
      );
    }

    if (state.job!.isCompleted && state.job!.outputImageUrl != null) {
      return InteractiveViewer(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(state.job!.outputImageUrl!, fit: BoxFit.contain),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
