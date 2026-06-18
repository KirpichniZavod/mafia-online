package com.mafia.online.data.model

data class User(
    val id: Int,
    val nickname: String,
    val login: String = "",
    val isAdmin: Boolean = false,
    val isBanned: Boolean = false,
    val banReason: String? = null,
    val banUntil: String? = null,
    val theme: String = "dark",
    val avatar: String? = null,
    val wins: Int = 0,
    val losses: Int = 0,
    val gamesPlayed: Int = 0,
    val createdAt: String = ""
)

data class AuthResponse(
    val token: String,
    val user: User
)

data class BanResponse(
    val error: String,
    val banned: Boolean,
    val reason: String?,
    val until: String?
)

data class Room(
    val id: Int,
    val name: String,
    val players: Int,
    val maxPlayers: Int
)

data class Player(
    val id: Int,
    val nickname: String,
    val avatar: String?,
    val role: String?,
    val isAlive: Boolean,
    val isHost: Boolean = false
)

data class GameHistory(
    val id: Int,
    val roomId: Int,
    val winner: String,
    val players: String,
    val duration: Int,
    val createdAt: String
)

data class LeaderboardEntry(
    val id: Int,
    val nickname: String,
    val wins: Int,
    val losses: Int,
    val gamesPlayed: Int,
    val avatar: String?,
    val winRate: Int,
    val rating: Int
)
