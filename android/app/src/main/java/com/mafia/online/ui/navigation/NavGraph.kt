package com.mafia.online.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.mafia.online.data.api.ApiService
import com.mafia.online.data.repository.AuthRepository
import com.mafia.online.ui.screens.banned.BannedScreen
import com.mafia.online.ui.screens.game.GameScreen
import com.mafia.online.ui.screens.lobby.LobbyScreen
import com.mafia.online.ui.screens.login.LoginScreen
import com.mafia.online.ui.screens.profile.ProfileScreen
import com.mafia.online.ui.screens.register.RegisterScreen
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

@Composable
fun MafiaNavGraph() {
    val navController = rememberNavController()
    val context = androidx.compose.ui.platform.LocalContext.current

    val api = Retrofit.Builder()
        .baseUrl("https://mafia-server-eljy.onrender.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    val repository = remember { AuthRepository(api, context) }
    var user by remember { mutableStateOf<com.mafia.online.data.model.User?>(null) }
    var banInfo by remember { mutableStateOf<Pair<String?, String?>?>(null) }

    LaunchedEffect(Unit) {
        val token = repository.getToken()
        if (token != null) {
            try {
                user = api.getProfile("Bearer $token")
                if (user?.isBanned == true) {
                    banInfo = Pair(user?.banReason, user?.banUntil)
                }
            } catch (e: Exception) {
                // Token expired
            }
        }
    }

    if (banInfo != null) {
        BannedScreen(reason = banInfo!!.first, until = banInfo!!.second)
        return
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                onLogin = { userData, token ->
                    user = userData
                    navController.navigate("lobby") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onRegister = { navController.navigate("register") }
            )
        }

        composable("register") {
            RegisterScreen(
                onRegister = { userData, token ->
                    user = userData
                    navController.navigate("lobby") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable("lobby") {
            user?.let { u ->
                LobbyScreen(
                    user = u,
                    token = repository.getToken() ?: "",
                    onJoinRoom = { roomId -> navController.navigate("game/$roomId") }
                )
            }
        }

        composable(
            "game/{roomId}",
            arguments = listOf(navArgument("roomId") { type = NavType.StringType })
        ) { backStackEntry ->
            val roomId = backStackEntry.arguments?.getString("roomId") ?: return@composable
            user?.let { u ->
                GameScreen(
                    user = u,
                    token = repository.getToken() ?: "",
                    roomId = roomId,
                    onLeave = { navController.popBackStack() },
                    onBanned = { reason, until ->
                        banInfo = Pair(reason, until)
                    }
                )
            }
        }

        composable("profile") {
            user?.let { u ->
                ProfileScreen(
                    user = u,
                    token = repository.getToken() ?: "",
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
