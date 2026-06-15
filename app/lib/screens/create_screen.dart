import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../models/event.dart';
import '../providers/auth_provider.dart';
import '../widgets/upload_selfie.dart';

class CreateScreen extends ConsumerStatefulWidget {
  final Event event;
  const CreateScreen({super.key, required this.event});

  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  File? _selectedFile;
  bool _isGenerating = false;
  String? _errorMessage;

  Future<void> _onGenerate() async {
    if (_selectedFile == null) return;

    setState(() { _isGenerating = true; _errorMessage = null; });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.generate(_selectedFile!, widget.event.id);

      if (!response.success || response.data == null) {
        setState(() {
          _isGenerating = false;
          _errorMessage = response.error ?? 'Generation failed';
        });
        return;
      }

      final generationId = response.data!['generationId'] as String;
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/result', arguments: generationId);
      }
    } catch (e) {
      setState(() {
        _isGenerating = false;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final timePeriod = event.timePeriod;

    return Scaffold(
      appBar: AppBar(title: Text(event.title)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            if (event.thumbnailUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: Image.network(event.thumbnailUrl!, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(color: AppTheme.surfaceColor)),
                ),
              ),

            const SizedBox(height: 16),

            // Category + Title
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.categoryColor(event.category),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(event.category, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(event.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
            ]),

            const SizedBox(height: 20),

            // Upload selfie
            const Text('Your Selfie', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            UploadSelfie(
              selectedFile: _selectedFile,
              uploading: false,
              disabled: _isGenerating,
              onFileSelected: (file) => setState(() => _selectedFile = file),
            ),

            const SizedBox(height: 20),

            // Error
            if (_errorMessage != null)
              Container(
                width: double.infinity, padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
              ),

            // Generate button
            SizedBox(
              width: double.infinity, height: 52,
              child: ElevatedButton.icon(
                onPressed: (_selectedFile != null && !_isGenerating) ? _onGenerate : null,
                icon: _isGenerating
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.auto_awesome),
                label: Text(_isGenerating ? 'Generating...' : 'Generate ${timePeriod.isNotEmpty ? timePeriod : ''}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
