import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../config/api_config.dart';

/// Widget for selecting a selfie image via gallery or camera.
class UploadSelfie extends StatelessWidget {
  final File? selectedFile;
  final bool uploading;
  final bool disabled;
  final ValueChanged<File?> onFileSelected;

  const UploadSelfie({
    super.key,
    required this.selectedFile,
    this.uploading = false,
    this.disabled = false,
    required this.onFileSelected,
  });

  bool _isValidType(String path) {
    final ext = path.split('.').last.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].contains(ext);
  }

  Future<void> _pickImage(BuildContext context) async {
    if (disabled || uploading) return;

    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a Photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final xFile = await picker.pickImage(
      source: source,
      maxWidth: 2048,
      maxHeight: 2048,
    );

    if (xFile == null) return;

    final file = File(xFile.path);

    // Validate size
    final size = await file.length();
    if (size > ApiConfig.maxSelfieSize) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Image too large. Maximum size is 10 MB.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Validate type
    if (!_isValidType(xFile.path)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid file type. Use JPEG, PNG, or WebP.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    onFileSelected(file);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _pickImage(context),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: Colors.white.withValues(alpha: selectedFile != null ? 0.4 : 0.15),
            width: 2,
          ),
          borderRadius: BorderRadius.circular(12),
          color: selectedFile != null
              ? Colors.white.withValues(alpha: 0.05)
              : null,
        ),
        child: uploading
            ? const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(height: 8),
                  Text('Uploading...', style: TextStyle(fontSize: 14, color: Colors.white54)),
                ],
              )
            : selectedFile != null
                ? Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          selectedFile!,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Selfie selected',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tap to change photo',
                              style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.5)),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.check_circle, color: Colors.green, size: 24),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add_a_photo_outlined, size: 40, color: Colors.white.withValues(alpha: 0.4)),
                      const SizedBox(height: 8),
                      const Text(
                        'Upload your selfie',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'JPEG, PNG, or WebP • Max 10 MB',
                        style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.4)),
                      ),
                    ],
                  ),
      ),
    );
  }
}
