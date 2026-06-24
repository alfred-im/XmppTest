import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../theme/alfred_colors.dart';

class ChatInputBar extends StatefulWidget {
  const ChatInputBar({
    super.key,
    this.enabled = true,
    this.onSend,
    this.onSendGif,
  });

  final bool enabled;
  final Future<void> Function(String body)? onSend;
  final Future<void> Function(Uint8List bytes)? onSendGif;

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.onSend == null) return;
    _controller.clear();
    await widget.onSend!(text);
  }

  Future<void> _pickGif() async {
    if (!widget.enabled || widget.onSendGif == null) return;

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['gif'],
      withData: true,
      allowMultiple: false,
    );

    final bytes = result?.files.single.bytes;
    if (bytes == null || bytes.isEmpty) return;
    await widget.onSendGif!(Uint8List.fromList(bytes));
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AlfredColors.panel,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: widget.enabled ? _pickGif : null,
                tooltip: 'Invia GIF',
                icon: Icon(
                  Icons.gif_box_outlined,
                  color: widget.enabled
                      ? AlfredColors.textPrimary
                      : AlfredColors.textSecondary,
                ),
              ),
              Expanded(
                child: TextField(
                  controller: _controller,
                  enabled: widget.enabled,
                  decoration: const InputDecoration(
                    hintText: 'Scrivi un messaggio',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  textInputAction: TextInputAction.send,
                  onSubmitted: widget.enabled ? (_) => _submit() : null,
                ),
              ),
              const SizedBox(width: 4),
              Material(
                color: AlfredColors.charcoal,
                borderRadius: BorderRadius.circular(24),
                child: InkWell(
                  onTap: widget.enabled ? _submit : null,
                  borderRadius: BorderRadius.circular(24),
                  child: const Padding(
                    padding: EdgeInsets.all(10),
                    child: Icon(Icons.send, color: Colors.white, size: 22),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
