package com.mafia.online.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.api.ApiService
import com.mafia.online.data.model.User
import com.mafia.online.ui.theme.*
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

@Composable
fun ProfileScreen(
    user: User,
    token: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val api = remember {
        Retrofit.Builder()
            .baseUrl("https://mafia-server-eljy.onrender.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    val presetAvatars = listOf(
        "🎭", "🦊", "🐺", "💀", "🃏", "🎪", "🌙", "⚡", "🗡️", "🔫",
        "👑", "🏆", "🎯", "🎲", "🔮", "💎", "🔥", "❄️", "🌊", "🌸",
        "🐱", "🐶", "🦁", "🐻", "🐸", "🐧", "🦋", "🐉", "👻", "🤖"
    )

    var selectedAvatar by remember { mutableStateOf(user.avatar) }
    var profile by remember { mutableStateOf(user) }
    val winRate = if (profile.gamesPlayed > 0) (profile.wins * 100 / profile.gamesPlayed) else 0

    LaunchedEffect(Unit) {
        try {
            profile = api.getProfile("Bearer $token")
            selectedAvatar = profile.avatar
        } catch (_: Exception) {}
    }

    Column(
        modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark))).padding(16.dp)
    ) {
        Text("Профиль", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(64.dp).clip(CircleShape).background(SurfaceDark), contentAlignment = Alignment.Center) {
                    Text(selectedAvatar ?: "👤", fontSize = 32.sp)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(profile.nickname, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Логин: ${profile.login}", color = TextSecondary)
                    Text("Зарегистрирован: ${profile.createdAt.take(10)}", color = TextMuted, fontSize = 14.sp)
                    if (profile.isAdmin) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Администратор", color = AccentGlow, fontSize = 12.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Статистика", fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    StatItem("${profile.wins}", "Победы", Success)
                    StatItem("${profile.losses}", "Поражения", Danger)
                    StatItem("$winRate%", "Винрейт", AccentGlow)
                }
                Text("Всего игр: ${profile.gamesPlayed}", modifier = Modifier.fillMaxWidth().padding(top = 8.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = TextSecondary)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Аватар", fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(modifier = Modifier.height(12.dp))
                LazyVerticalGrid(columns = GridCells.Fixed(6), modifier = Modifier.height(200.dp)) {
                    items(presetAvatars) { avatar ->
                        Box(
                            modifier = Modifier.padding(4.dp).size(48.dp).clip(RoundedCornerShape(12.dp))
                                .background(if (selectedAvatar == avatar) AccentPrimary else SurfaceDark)
                                .clickable {
                                    selectedAvatar = avatar
                                    scope.launch {
                                        try {
                                            api.setAvatar("Bearer $token", mapOf("avatar" to avatar))
                                        } catch (_: Exception) {}
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) { Text(avatar, fontSize = 24.sp) }
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = color)
        Text(label, color = TextMuted, fontSize = 14.sp)
    }
}
