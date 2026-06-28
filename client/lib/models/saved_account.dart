class SavedAccount {
  const SavedAccount({
    required this.userId,
    required this.username,
    required this.refreshToken,
    required this.displayName,
    this.avatarUrl,
    this.pronouns,
  });

  final String userId;
  final String username;
  final String refreshToken;
  final String displayName;
  final String? avatarUrl;
  final String? pronouns;

  SavedAccount copyWith({
    String? username,
    String? refreshToken,
    String? displayName,
    String? avatarUrl,
    String? pronouns,
    bool clearAvatarUrl = false,
    bool clearPronouns = false,
  }) {
    return SavedAccount(
      userId: userId,
      username: username ?? this.username,
      refreshToken: refreshToken ?? this.refreshToken,
      displayName: displayName ?? this.displayName,
      avatarUrl: clearAvatarUrl ? null : avatarUrl ?? this.avatarUrl,
      pronouns: clearPronouns ? null : pronouns ?? this.pronouns,
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'username': username,
        'refreshToken': refreshToken,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'pronouns': pronouns,
      };

  factory SavedAccount.fromJson(Map<String, dynamic> json) {
    final username = json['username'] as String? ?? '';
    return SavedAccount(
      userId: json['userId'] as String,
      username: username,
      refreshToken: json['refreshToken'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      pronouns: json['pronouns'] as String?,
    );
  }
}
