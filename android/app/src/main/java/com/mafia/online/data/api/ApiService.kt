package com.mafia.online.data.api

import com.mafia.online.data.model.*
import retrofit2.http.*

interface ApiService {

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @GET("api/profile/me")
    suspend fun getProfile(@Header("Authorization") token: String): User

    @PUT("api/profile/avatar")
    suspend fun setAvatar(
        @Header("Authorization") token: String,
        @Body body: Map<String, String>
    ): Map<String, Any>

    @PUT("api/profile/theme")
    suspend fun setTheme(
        @Header("Authorization") token: String,
        @Body body: Map<String, String>
    ): Map<String, Boolean>

    @GET("api/profile/history")
    suspend fun getHistory(@Header("Authorization") token: String): List<GameHistory>

    @GET("api/leaderboard")
    suspend fun getLeaderboard(): List<LeaderboardEntry>

    @GET("api/admin/users")
    suspend fun getAdminUsers(@Header("Authorization") token: String): List<User>

    @GET("api/admin/rooms")
    suspend fun getAdminRooms(@Header("Authorization") token: String): List<Any>

    @POST("api/admin/ban/{userId}")
    suspend fun banUser(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int,
        @Body body: Map<String, String?>
    ): Map<String, Any>

    @POST("api/admin/unban/{userId}")
    suspend fun unbanUser(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): Map<String, Any>

    @POST("api/admin/kick/{roomId}/{userId}")
    suspend fun kickUser(
        @Header("Authorization") token: String,
        @Path("roomId") roomId: Int,
        @Path("userId") userId: Int
    ): Map<String, String>
}
