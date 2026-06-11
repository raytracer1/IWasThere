import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/job_provider.dart';
import '../widgets/job_status_widget.dart';

/// Result screen — polls job status and shows the generated video.
class ResultScreen extends ConsumerWidget {
  final String jobId;

  const ResultScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    // If not logged in, redirect to home
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacementNamed('/home');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final jobState = ref.watch(jobProvider(jobId));

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
            // Job info (if available)
            if (jobState.job?.event != null) ...[
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.categoryColor(jobState.job!.event!.category),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      jobState.job!.event!.category.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      jobState.job!.event!.title,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],

            // Job status
            Expanded(
              child: JobStatusWidget(
                job: jobState.job,
                isLoading: jobState.isLoading,
                error: jobState.error,
              ),
            ),

            // Action buttons after completion or failure
            if (jobState.job?.isTerminal == true) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (jobState.job!.isFailed)
                    ElevatedButton.icon(
                      onPressed: () => Navigator.of(context).pushReplacementNamed('/home'),
                      icon: const Icon(Icons.home, size: 18),
                      label: const Text('Back to Events'),
                    ),
                  if (jobState.job!.isCompleted) ...[
                    OutlinedButton.icon(
                      onPressed: () => Navigator.of(context).pushNamed('/history'),
                      icon: const Icon(Icons.history, size: 18),
                      label: const Text('View History'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.of(context).pushReplacementNamed('/home'),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Create Another'),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 20),
            ],
          ],
        ),
      ),
    );
  }
}
