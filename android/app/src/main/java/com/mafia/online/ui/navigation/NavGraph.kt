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
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

@Composable
fun MafiaNavGraph() {
    val navController = rememberNavController()
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()

    val api = remember {
        Retrofit.Builder()
            .baseUrl("https://mafia-server-eljy.onrender.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    val repository = remember { AuthRepository(api, context) }
    var user by remember { mutableStateOf<com.mafia.online.data.model.User?>(null) }
    var banInfo by remember { mutableStateOf<Pair<String?, String?>?>(null) }
    var token by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val savedToken = repository.getToken()
        token = savedToken
        if (savedToken != null) {
            try {
                val fetchedUser = api.getProfile("Bearer $savedToken")
                user = fetchedUser
                if (fetchedUser.isBanned) {
                    banInfo = Pair(fetchedUser.banReason, fetchedUser.banUntil)
                }
            } catch (e: Exception) {
                // Token expired or invalid
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
                onLogin = { userData, userToken ->
                    user = userData
                    token = userToken
                    navController.navigate("lobby") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onRegister = { navController.navigate("register") }
            )
        }

        composable("register") {
            RegisterScreen(
                onRegister = { userData, userToken ->
                    user = userData
                    token = userToken
                    navController.navigate("lobby") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable("lobby") {
            val currentToken = token ?: return@composable
            user?.let { u ->
                LobbyScreen(
                    user = u,
                    token = currentToken,
                    onJoinRoom = { roomId -> navController.navigate("game/$roomId") }
                )
            }
        }

        composable(
            "game/{roomId}",
            arguments = listOf(navArgument("roomId") { type = NavType.StringType })
        ) { backStackEntry ->
            val roomId = backStackEntry.arguments?.getString("roomId") ?: return@composable
            val currentToken = token ?: return@composable
            user?.let { u ->
                GameScreen(
                    user = u,
                    token = currentToken,
                    roomId = roomId,
                    onLeave = { navController.popBackStack() },
                    onBanned = { reason, until ->
                        banInfo = Pair(reason, until)
                    }
                )
            }
        }

        composable("profile") {
            val currentToken = token ?: return@composable
            user?.let { u ->
                ProfileScreen(
                    user = u,
                    token = currentToken,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
