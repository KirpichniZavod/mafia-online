package com.mafia.online.ui.screens.game

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.model.Player
import com.mafia.online.data.model.User
import com.mafia.online.ui.theme.*

@Composable
fun GameScreen(
    user: User,
    token: String,
    roomId: String,
    onLeave: () -> Unit,
    onBanned: (String?, String?) -> Unit
) {
    var players by remember { mutableStateOf(listOf<Player>()) }
    var role by remember { mutableStateOf<String?>(null) }
    var isAlive by remember { mutableStateOf(true) }
    var phase by remember { mutableStateOf("waiting") }
    var dayNumber by remember { mutableStateOf(0) }
    var timeLeft by remember { mutableStateOf(0) }
    var isHost by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var selectedTarget by remember { mutableStateOf<Int?>(null) }
    var actionMade by remember { mutableStateOf(false) }

    val roleNames = mapOf(
        "mafia" to "Мафия",
        "commissioner" to "Шериф",
        "doctor" to "Врач",
        "civilian" to "Мирный"
    )
    val roleIcons = mapOf(
        "mafia" to "🗡️",
        "commissioner" to "🔍",
        "doctor" to "💊",
        "civilian" to "👤"
    )
    val roleColors = mapOf(
        "mafia" to Danger,
        "commissioner" to Warning,
        "doctor" to Success,
        "civilian" to TextPrimary
    )

    val alivePlayers = players.filter { it.isAlive && it.id != user.id }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(BackgroundDark, SurfaceDark)
                )
            )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Комната #$roomId",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    if (phase != "waiting" && phase != "ended") {
                        val phaseText = if (phase == "night") "🌙 Ночь" else "☀️ День"
                        Text(
                            text = "$phaseText — День $dayNumber",
                            color = TextMuted
                        )
                    }
                }

                Button(
                    onClick = onLeave,
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)
                ) {
                    Text("Покинуть")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (error.isNotEmpty()) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.2f))
                ) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(12.dp),
                        color = Danger
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Игроки (${players.count { it.isAlive }})",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyColumn {
                        items(players) { player ->
                            PlayerCard(
                                player = player,
                                isCurrentUser = player.id == user.id,
                                onClick = {
                                    if (phase == "night" && isAlive && !actionMade && role == "mafia") {
                                        selectedTarget = player.id
                                    }
                                    if (phase == "day" && isAlive && !actionMade) {
                                        selectedTarget = player.id
                                    }
                                }
                            )
                        }
                    }
                }
            }

            if (phase == "waiting" && isHost && players.size >= 2 && user.isAdmin) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { /* TODO: Start game via socket */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)
                ) {
                    Text("👑 Начать игру (${players.size} игроков) — Админ-режим")
                }
            }

            if (phase == "waiting" && isHost && !user.isAdmin && players.size >= 5) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { /* TODO: Start game via socket */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)
                ) {
                    Text("Начать игру (${players.size} игроков)")
                }
            }

            role?.let { r ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = CardDark)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = roleIcons[r] ?: "", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Ваша роль: ${roleNames[r]}",
                                fontWeight = FontWeight.Bold,
                                color = roleColors[r] ?: TextPrimary
                            )
                            val descriptions = mapOf(
                                "mafia" to "Убивайте мирных ночью",
                                "commissioner" to "Проверяйте игроков ночью",
                                "doctor" to "Лечите игроков ночью",
                                "civilian" to "Голосуйте днём за исключение мафии"
                            )
                            Text(
                                text = descriptions[r] ?: "",
                                color = TextMuted,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlayerCard(player: Player, isCurrentUser: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrentUser) AccentPrimary.copy(alpha = 0.3f)
            else if (!player.isAlive) Danger.copy(alpha = 0.2f)
            else SurfaceDark
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${player.nickname}${if (isCurrentUser) " (Вы)" else ""}",
                color = if (player.isAlive) TextPrimary else TextMuted
            )
            if (!player.isAlive) {
                Text(text = "💀")
            }
        }
    }
}
