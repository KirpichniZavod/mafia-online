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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.model.User
import com.mafia.online.ui.theme.*

@Composable
fun ProfileScreen(
    user: User,
    token: String,
    onBack: () -> Unit
) {
    val presetAvatars = listOf(
        "🎭", "🦊", "🐺", "💀", "🃏", "🎪", "🌙", "⚡", "🗡️", "🔫",
        "👑", "🏆", "🎯", "🎲", "🔮", "💎", "🔥", "❄️", "🌊", "🌸",
        "🐱", "🐶", "🦁", "🐻", "🐸", "🐧", "🦋", "🐉", "👻", "🤖"
    )

    var selectedAvatar by remember { mutableStateOf(user.avatar) }
    val winRate = if (user.gamesPlayed > 0) (user.wins * 100 / user.gamesPlayed) else 0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(BackgroundDark, SurfaceDark)
                )
            )
            .padding(16.dp)
    ) {
        Text(
            text = "Профиль",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(SurfaceDark),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = selectedAvatar ?: "👤",
                        fontSize = 32.sp
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(text = user.nickname, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(text = "Логин: ${user.login}", color = TextSecondary)
                    Text(
                        text = "Зарегистрирован: ${user.createdAt.take(10)}",
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                    if (user.isAdmin) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Администратор",
                            color = AccentGlow,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Статистика",
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem(value = "${user.wins}", label = "Победы", color = Success)
                    StatItem(value = "${user.losses}", label = "Поражения", color = Danger)
                    StatItem(value = "$winRate%", label = "Винрейт", color = AccentGlow)
                }
                Text(
                    text = "Всего игр: ${user.gamesPlayed}",
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    color = TextSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Аватар",
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyVerticalGrid(
                    columns = GridCells.Fixed(6),
                    modifier = Modifier.height(200.dp)
                ) {
                    items(presetAvatars) { avatar ->
                        Box(
                            modifier = Modifier
                                .padding(4.dp)
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    if (selectedAvatar == avatar) AccentPrimary
                                    else SurfaceDark
                                )
                                .clickable {
                                    selectedAvatar = avatar
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = avatar, fontSize = 24.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = color)
        Text(text = label, color = TextMuted, fontSize = 14.sp)
    }
}
