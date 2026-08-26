import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WormGPTApp());
}

class WormGPTApp extends StatefulWidget {
  const WormGPTApp({super.key});
  @override
  State<WormGPTApp> createState() => _WormGPTAppState();
}

class _WormGPTAppState extends State<WormGPTApp> {
  bool _darkMode = true;
  String _selectedProvider = 'groq';
  String _selectedModel = 'qwen/qwen3.6-27b';
  List<ChatThread> _threads = [];
  String _activeThreadId = '';
  int _nextChatNumber = 3;
  String _groqKey = '';
  String _geminiKey = '';
  String _ollamaUrl = 'http://localhost:11434';
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _isLoading = false;

  static const Map<String, List<Map<String, String>>> modelOptions = {
    'groq': [
      {'id': 'qwen/qwen3.6-27b', 'label': 'Qwen 3.6 27B'},
      {'id': 'openai/gpt-oss-120b', 'label': 'GPT OSS 120B'},
      {'id': 'allam-2-7b', 'label': 'Allam 2 7B'},
    ],
    'gemini': [
      {'id': 'gemini-3.6-flash', 'label': 'Gemini 3.6 Flash'},
      {'id': 'gemini-3.7-flash', 'label': 'Gemini 3.7 Flash'},
      {'id': 'gemini-3.5-flash', 'label': 'Gemini 3.5 Flash'},
      {'id': 'gemini-3.5-flash-lite', 'label': 'Gemini 3.5 Flash Lite'},
    ],
    'ollama': [
      {'id': 'llama3.2', 'label': 'Llama 3.2'},
      {'id': 'codellama', 'label': 'CodeLlama'},
      {'id': 'mistral', 'label': 'Mistral'},
    ],
  };

  // Firewire colors
  static const Color fwBg = Color(0xFF0A0A0A);
  static const Color fwBg1 = Color(0xFF111111);
  static const Color fwBg2 = Color(0xFF1A1A1A);
  static const Color fwBorder = Color(0xFF262626);
  static const Color fwText = Color(0xFFFAFAFA);
  static const Color fwTextDim = Color(0xFFA3A3A3);
  static const Color fwTextMuted = Color(0xFF525252);
  static const Color fwAccent = Color(0xFFFAFAFA);
  static const Color fwSuccess = Color(0xFF4ADE80);
  static const Color fwError = Color(0xFFF87171);

  ChatThread get _activeThread => _threads.firstWhere(
        (t) => t.id == _activeThreadId,
        orElse: () => _threads.isNotEmpty
            ? _threads[0]
            : ChatThread(id: '0', title: 'New', messages: []),
      );

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedProvider = prefs.getString('provider') ?? 'groq';
      _selectedModel = prefs.getString('model') ?? 'qwen/qwen3.6-27b';
      _groqKey = prefs.getString('groq_key') ?? _groqKey;
      _geminiKey = prefs.getString('gemini_key') ?? _geminiKey;
      _ollamaUrl = prefs.getString('ollama_url') ?? _ollamaUrl;
      _darkMode = prefs.getBool('dark_mode') ?? true;
      final threadsJson = prefs.getStringList('threads') ?? [];
      _threads = threadsJson.map((j) => ChatThread.fromJson(jsonDecode(j))).toList();
      if (_threads.isEmpty) {
        _threads = [
          ChatThread(id: '1', title: 'Chat 1', messages: []),
          ChatThread(id: '2', title: 'Chat 2', messages: []),
        ];
      }
      _activeThreadId = prefs.getString('active_id') ?? _threads[0].id;
      if (!_threads.any((t) => t.id == _activeThreadId) && _threads.isNotEmpty) {
        _activeThreadId = _threads[0].id;
      }
    });
    _nextChatNumber = prefs.getInt('next_num') ?? 3;
  }

  Future<void> _saveState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('threads', _threads.map((t) => jsonEncode(t.toJson())).toList());
    await prefs.setString('active_id', _activeThreadId);
    await prefs.setInt('next_num', _nextChatNumber);
    await prefs.setString('provider', _selectedProvider);
    await prefs.setString('model', _selectedModel);
    await prefs.setString('groq_key', _groqKey);
    await prefs.setString('gemini_key', _geminiKey);
    await prefs.setString('ollama_url', _ollamaUrl);
    await prefs.setBool('dark_mode', _darkMode);
  }

  void _createNewThread() {
    _nextChatNumber++;
    final t = ChatThread(id: DateTime.now().millisecondsSinceEpoch.toString(), title: 'Chat $_nextChatNumber', messages: []);
    setState(() { _threads.insert(0, t); _activeThreadId = t.id; });
    _saveState();
    Navigator.of(context).pop();
  }

  void _deleteThread(String id) {
    setState(() {
      _threads.removeWhere((t) => t.id == id);
      if (_threads.isEmpty) { _createNewThread(); }
      else if (_activeThreadId == id) { _activeThreadId = _threads.first.id; }
    });
    _saveState();
  }

  void _switchThread(String id) {
    setState(() { _activeThreadId = id; });
    _saveState();
    Navigator.of(context).pop();
  }

  void _sendMessage() {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isLoading) return;
    setState(() {
      final idx = _threads.indexWhere((t) => t.id == _activeThreadId);
      if (idx != -1) { _threads[idx].messages.add(Message(role: 'user', content: text)); }
    });
    _inputController.clear();
    _saveState();
    _getApiReply();
  }

  Future<void> _getApiReply() async {
    setState(() => _isLoading = true);
    try {
      final activeIdx = _threads.indexWhere((t) => t.id == _activeThreadId);
      if (activeIdx == -1) return;
      final messages = _threads[activeIdx].messages.map((m) => {'role': m.role, 'content': m.content}).toList();
      String reply;
      if (_selectedProvider == 'ollama') {
        reply = 'Ollama is local only. Set up a local server to use it.';
      } else if (_selectedProvider == 'gemini') {
        reply = await _callGeminiApi(messages);
      } else {
        reply = await _callGroqApi(messages);
      }
      reply = reply.replaceAll(RegExp(r'<think>[\s\S]*?<\/think>'), '').trim();
      setState(() {
        final idx = _threads.indexWhere((t) => t.id == _activeThreadId);
        if (idx != -1) { _threads[idx].messages.add(Message(role: 'assistant', content: reply)); }
      });
      _saveState();
    } catch (e) {
      setState(() {
        final idx = _threads.indexWhere((t) => t.id == _activeThreadId);
        if (idx != -1) { _threads[idx].messages.add(Message(role: 'assistant', content: 'Error: ${e.toString()}')); }
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<String> _callGroqApi(List<Map<String, String>> messages) async {
    if (_groqKey.isEmpty) throw Exception('No Groq API key set');
    final response = await http.post(
      Uri.parse('https://api.groq.com/openai/v1/chat/completions'),
      headers: {'Authorization': 'Bearer $_groqKey', 'Content-Type': 'application/json'},
      body: jsonEncode({'model': _selectedModel, 'messages': messages, 'temperature': 0.7, 'top_p': 0.95}),
    ).timeout(const Duration(seconds: 30));
    final data = jsonDecode(response.body);
    if (response.statusCode != 200) throw Exception(data['error']?['message'] ?? 'Groq API error');
    final content = data['choices']?[0]?['message']?['content'];
    if (content == null || content.isEmpty) throw Exception('Groq returned no content');
    return content;
  }

  Future<String> _callGeminiApi(List<Map<String, String>> messages) async {
    if (_geminiKey.isEmpty) throw Exception('No Gemini API key set');
    final contents = messages.where((m) => m['role'] != 'system').map((m) => {
      'role': m['role'] == 'assistant' ? 'model' : 'user',
      'parts': [{'text': m['content']}],
    }).toList();
    final body = {'contents': contents, 'generationConfig': {'temperature': 0.7, 'topP': 0.95}};
    final response = await http.post(
      Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/$_selectedModel:generateContent?key=$_geminiKey'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 60));
    final data = jsonDecode(response.body);
    if (response.statusCode != 200) throw Exception(data['error']?['message'] ?? 'Gemini API error');
    final content = data['candidates']?[0]?['content']?['parts']?[0]?['text'];
    if (content == null || content.isEmpty) throw Exception('Gemini returned no content');
    return content;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Firewire',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: _darkMode ? Brightness.dark : Brightness.light,
        scaffoldBackgroundColor: _darkMode ? fwBg : const Color(0xFFFAFAFA),
        colorScheme: ColorScheme(
          brightness: _darkMode ? Brightness.dark : Brightness.light,
          primary: _darkMode ? fwAccent : const Color(0xFF171717),
          onPrimary: _darkMode ? fwBg1 : Colors.white,
          secondary: _darkMode ? fwAccent : const Color(0xFF171717),
          onSecondary: _darkMode ? fwBg1 : Colors.white,
          surface: _darkMode ? fwBg1 : Colors.white,
          onSurface: _darkMode ? fwText : const Color(0xFF171717),
          outline: _darkMode ? fwBorder : const Color(0xFFE5E5E5),
          error: fwError,
          onError: Colors.white,
        ),
        dividerColor: _darkMode ? fwBorder : const Color(0xFFE5E5E5),
        textTheme: const TextTheme(bodyLarge: TextStyle(fontSize: 14), bodyMedium: TextStyle(fontSize: 13)),
      ),
      home: Scaffold(
        key: _scaffoldKey,
        backgroundColor: _darkMode ? fwBg : const Color(0xFFFAFAFA),
        drawer: Drawer(
          backgroundColor: _darkMode ? fwBg1 : Colors.white,
          child: _buildSidebar(),
        ),
        body: Row(
          children: [
            _buildSidebar(),
            Expanded(child: _buildMainContent()),
          ],
        ),
      ),
    );
  }

  Widget _buildSidebar() {
    final bg = _darkMode ? fwBg1 : Colors.white;
    final border = _darkMode ? fwBorder : const Color(0xFFE5E5E5);
    final text = _darkMode ? fwText : const Color(0xFF171717);
    final textDim = _darkMode ? fwTextDim : const Color(0xFF525252);
    final textMuted = _darkMode ? fwTextMuted : const Color(0xFFA3A3A3);
    final bg2 = _darkMode ? fwBg2 : const Color(0xFFF5F5F5);

    return Container(
      width: 240,
      decoration: BoxDecoration(color: bg, border: Border(right: BorderSide(color: border))),
      child: Column(
        children: [
          // Top: New Chat button
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: GestureDetector(
              onTap: _createNewThread,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: bg2,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, size: 14, color: textDim),
                    const SizedBox(width: 6),
                    Text('New Chat', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: textDim)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Chat list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              itemCount: _threads.length,
              itemBuilder: (ctx, i) {
                final t = _threads[i];
                final isActive = t.id == _activeThreadId;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 1),
                  child: Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(999),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () => _switchThread(t.id),
                      onLongPress: () => _deleteThread(t.id),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: isActive
                            ? BoxDecoration(color: bg2, borderRadius: BorderRadius.circular(999))
                            : null,
                        child: Row(
                          children: [
                            Icon(Icons.chat_bubble_outline, size: 14, color: isActive ? text : textMuted),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(t.title,
                                  style: TextStyle(fontSize: 13, fontWeight: isActive ? FontWeight.w500 : FontWeight.w400, color: isActive ? text : textDim),
                                  overflow: TextOverflow.ellipsis),
                            ),
                            GestureDetector(
                              onTap: () => _deleteThread(t.id),
                              child: Icon(Icons.close, size: 12, color: textMuted),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Bottom: settings gear + status
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: border))),
            child: Row(
              children: [
                Container(
                  width: 6, height: 6,
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: fwSuccess),
                ),
                const SizedBox(width: 6),
                Text('Ready', style: TextStyle(fontSize: 11, color: textMuted)),
                const Spacer(),
                GestureDetector(
                  onTap: () {},
                  child: Icon(Icons.settings, size: 16, color: textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    final bg = _darkMode ? fwBg : const Color(0xFFFAFAFA);
    final border = _darkMode ? fwBorder : const Color(0xFFE5E5E5);
    final textMuted = _darkMode ? fwTextMuted : const Color(0xFFA3A3A3);

    return Column(
      children: [
        // Top bar
        Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: bg, border: Border(bottom: BorderSide(color: border))),
          child: Row(
            children: [
              Builder(builder: (ctx) => GestureDetector(
                onTap: () => Scaffold.of(ctx).openDrawer(),
                child: _iconBtn(Icons.menu, textMuted),
              )),
              const SizedBox(width: 8),
              Text(_activeThread.title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _textDimColor)),
            ],
          ),
        ),
        // Chat area
        Expanded(child: _buildChatArea()),
      ],
    );
  }

  Color get _textColor => _darkMode ? fwText : const Color(0xFF171717);
  Color get _textDimColor => _darkMode ? fwTextDim : const Color(0xFF525252);
  Color get _textMutedColor => _darkMode ? fwTextMuted : const Color(0xFFA3A3A3);
  Color get _bg1Color => _darkMode ? fwBg1 : Colors.white;
  Color get _bg2Color => _darkMode ? fwBg2 : const Color(0xFFF5F5F5);
  Color get _borderColor => _darkMode ? fwBorder : const Color(0xFFE5E5E5);

  Widget _iconBtn(IconData icon, Color color) {
    return Container(
      width: 28, height: 28,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), border: Border.all(color: _borderColor), color: _bg1Color),
      child: Icon(icon, size: 14, color: color),
    );
  }

  Widget _buildChatArea() {
    final msgs = _activeThread.messages;
    if (msgs.isEmpty) {
      return Center(child: Text('What can I help with?', style: TextStyle(fontSize: 18, color: _textMutedColor, fontWeight: FontWeight.w400)));
    }
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            itemCount: msgs.length + (_isLoading ? 1 : 0),
            itemBuilder: (ctx, i) {
              if (i < msgs.length) return _buildMessage(msgs[i]);
              return _buildLoadingDots();
            },
          ),
        ),
        _buildInputArea(),
      ],
    );
  }

  Widget _buildMessage(Message msg) {
    final isUser = msg.role == 'user';
    return Container(
      constraints: const BoxConstraints(maxWidth: 720),
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                color: _darkMode ? fwAccent : const Color(0xFF171717),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Center(child: Text('A', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _darkMode ? fwBg1 : Colors.white))),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Text(isUser ? 'You' : 'Firewire', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _textMutedColor)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser ? (_darkMode ? fwAccent : const Color(0xFF171717)) : _bg2Color,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SelectableText(
                    msg.content,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.65,
                      color: isUser ? (_darkMode ? fwBg1 : Colors.white) : _textColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 10),
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                color: _bg2Color,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Center(child: Text('U', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _textDimColor))),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingDots() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 720),
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24, height: 24,
            decoration: BoxDecoration(
              color: _darkMode ? fwAccent : const Color(0xFF171717),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Center(child: Text('A', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _darkMode ? fwBg1 : Colors.white))),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Firewire', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _textMutedColor)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: _bg2Color, borderRadius: BorderRadius.circular(8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _dot(0), const SizedBox(width: 4), _dot(1), const SizedBox(width: 4), _dot(2),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _dot(int i) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.3, end: 1.0),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
      builder: (_, v, c) => Container(
        width: 4, height: 4,
        decoration: BoxDecoration(shape: BoxShape.circle, color: _textMutedColor.withValues(alpha: v)),
      ),
    );
  }

  Widget _buildInputArea() {
    final models = modelOptions[_selectedProvider] ?? modelOptions['groq']!;
    final currentModel = models.firstWhere((m) => m['id'] == _selectedModel, orElse: () => models[0]);
    final modelIdx = models.indexWhere((m) => m['id'] == _selectedModel);

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      constraints: const BoxConstraints(maxWidth: 720),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: _borderColor),
          borderRadius: BorderRadius.circular(8),
          color: _bg1Color,
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 2),
              child: TextField(
                controller: _inputController,
                maxLines: null,
                minLines: 1,
                style: TextStyle(fontSize: 14, color: _textColor),
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(color: _textMutedColor),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: _borderColor))),
              child: Row(
                children: [
                  // Model selector pill
                  GestureDetector(
                    onTap: () {
                      final nextIdx = (modelIdx + 1) % models.length;
                      setState(() => _selectedModel = models[nextIdx]['id']!);
                      _saveState();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        border: Border.all(color: _borderColor),
                        borderRadius: BorderRadius.circular(6),
                        color: _bg2Color,
                      ),
                      child: Text(currentModel['label']!, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _textDimColor, letterSpacing: 0.04)),
                    ),
                  ),
                  const Spacer(),
                  // Send button
                  GestureDetector(
                    onTap: _isLoading ? null : _sendMessage,
                    child: Container(
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        color: _isLoading ? _textMutedColor : (_darkMode ? fwAccent : const Color(0xFF171717)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: _isLoading
                          ? Padding(padding: const EdgeInsets.all(6), child: CircularProgressIndicator(strokeWidth: 1.5, color: _darkMode ? fwBg1 : Colors.white))
                          : Icon(Icons.arrow_forward, size: 12, color: _darkMode ? fwBg1 : Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Message {
  final String role;
  final String content;
  Message({required this.role, required this.content});
  Map<String, dynamic> toJson() => {'role': role, 'content': content};
  factory Message.fromJson(Map<String, dynamic> d) => Message(role: d['role'] ?? 'user', content: d['content'] ?? '');
}

class ChatThread {
  final String id;
  final String title;
  final List<Message> messages;
  ChatThread({required this.id, required this.title, required this.messages});
  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'messages': messages.map((m) => m.toJson()).toList()};
  factory ChatThread.fromJson(Map<String, dynamic> d) => ChatThread(
    id: d['id'] ?? '0',
    title: d['title'] ?? 'Chat',
    messages: (d['messages'] as List?)?.map((m) => Message.fromJson(m as Map<String, dynamic>)).toList() ?? [],
  );
}
