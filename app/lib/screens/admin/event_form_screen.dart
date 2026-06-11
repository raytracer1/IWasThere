import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../config/api_config.dart';
import '../../models/event.dart';
import '../../providers/auth_provider.dart';

/// Create / Edit event form screen.
class EventFormScreen extends ConsumerStatefulWidget {
  final Event? event; // null = create mode

  const EventFormScreen({super.key, this.event});

  @override
  ConsumerState<EventFormScreen> createState() => _EventFormScreenState();
}

class _EventFormScreenState extends ConsumerState<EventFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _priceController;

  String _category = 'other';
  String _status = 'draft';
  File? _videoFile;
  File? _thumbnailFile;
  bool _isSubmitting = false;
  String? _errorMessage;

  bool get _isEditing => widget.event != null;

  @override
  void initState() {
    super.initState();
    final event = widget.event;
    _titleController = TextEditingController(text: event?.title ?? '');
    _descriptionController = TextEditingController(text: event?.description ?? '');
    _priceController = TextEditingController(
      text: (event?.price ?? ApiConfig.costPerGeneration).toString(),
    );
    if (event != null) {
      _category = event.category;
      _status = event.status;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    return _titleController.text.trim().isNotEmpty && !_isSubmitting;
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final xFile = await picker.pickVideo(source: ImageSource.gallery);
    if (xFile == null) return;

    final file = File(xFile.path);
    final size = await file.length();
    if (size > ApiConfig.maxVideoSize) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Video too large. Max 100 MB.'), backgroundColor: Colors.red),
        );
      }
      return;
    }
    setState(() => _videoFile = file);
  }

  Future<void> _pickThumbnail() async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(source: ImageSource.gallery);
    if (xFile == null) return;

    final file = File(xFile.path);
    final size = await file.length();
    if (size > ApiConfig.maxThumbnailSize) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thumbnail too large. Max 5 MB.'), backgroundColor: Colors.red),
        );
      }
      return;
    }
    setState(() => _thumbnailFile = file);
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final apiService = ref.read(apiServiceProvider);

    try {
      final formData = FormData.fromMap({
        'title': _titleController.text.trim(),
        'category': _category,
        'description': _descriptionController.text.trim(),
        'price': double.tryParse(_priceController.text) ?? ApiConfig.costPerGeneration,
        'status': _status,
        if (_videoFile != null)
          'video': await MultipartFile.fromFile(_videoFile!.path, filename: 'video.mp4'),
        if (_thumbnailFile != null)
          'thumbnail': await MultipartFile.fromFile(_thumbnailFile!.path, filename: 'thumb.jpg'),
      });

      if (_isEditing) {
        final response = await apiService.updateEventMultipart(widget.event!.id, formData);
        if (response.success) {
          if (mounted) Navigator.pop(context, true);
        } else {
          setState(() => _errorMessage = response.error ?? 'Update failed');
        }
      } else {
        final response = await apiService.createEvent(formData);
        if (response.success) {
          if (mounted) Navigator.pop(context, true);
        } else {
          setState(() => _errorMessage = response.error ?? 'Create failed');
        }
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Event' : 'New Event'),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Title *',
                  hintText: 'Enter event title',
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Category
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: ApiConfig.categories.map((c) => DropdownMenuItem(
                  value: c,
                  child: Text(c[0].toUpperCase() + c.substring(1)),
                )).toList(),
                onChanged: (v) => setState(() => _category = v!),
              ),
              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Optional description',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),

              // Price
              TextFormField(
                controller: _priceController,
                decoration: const InputDecoration(
                  labelText: 'Price (USD)',
                  hintText: '0.50',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),

              // Status
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: ['draft', 'active', 'archived'].map((s) => DropdownMenuItem(
                  value: s,
                  child: Text(s[0].toUpperCase() + s.substring(1)),
                )).toList(),
                onChanged: (v) => setState(() => _status = v!),
              ),
              const SizedBox(height: 24),

              // Video picker
              const Text('Video', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _pickVideo,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.12),
                    ),
                    borderRadius: BorderRadius.circular(10),
                    color: _videoFile != null
                        ? Colors.white.withValues(alpha: 0.05)
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _videoFile != null ? Icons.check_circle : Icons.videocam,
                        color: _videoFile != null ? Colors.green : Colors.white38,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _videoFile != null
                            ? 'Video selected (${_videoFile!.path.split('/').last})'
                            : _isEditing ? 'Tap to replace video • Max 100 MB' : 'Tap to select video • Max 100 MB',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Thumbnail picker
              const Text('Thumbnail', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _pickThumbnail,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.12),
                    ),
                    borderRadius: BorderRadius.circular(10),
                    color: _thumbnailFile != null
                        ? Colors.white.withValues(alpha: 0.05)
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _thumbnailFile != null ? Icons.check_circle : Icons.image,
                        color: _thumbnailFile != null ? Colors.green : Colors.white38,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _thumbnailFile != null
                            ? 'Thumbnail selected'
                            : _isEditing ? 'Tap to replace thumbnail • Max 5 MB' : 'Tap to select thumbnail • Max 5 MB',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Error
              if (_errorMessage != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),

              // Submit
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _canSubmit ? _submit : null,
                  icon: _isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(_isEditing ? Icons.save : Icons.add),
                  label: Text(_isEditing ? 'Update Event' : 'Create Event'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
