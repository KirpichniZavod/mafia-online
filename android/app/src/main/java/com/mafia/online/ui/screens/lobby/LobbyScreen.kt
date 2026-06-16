package com.mafia.online.ui.screens.lobby

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.model.Room
import com.mafia.online.data.model.User
import com.mafia.online.ui.theme.*

@Composable
fun LobbyScreen(
    user: User,
    token: String,
    onJoinRoom: (Int) -> Unit
) {
    var rooms by remember { mutableStateOf(listOf<Room>()) }
    var showCreateDialog by remember { mutableStateOf(false) }

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
                Text(
                    text = "Лобби",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)
                ) {
                    Text("Создать комнату")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Доступные комнаты",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (rooms.isEmpty()) {
                        Text(
                            text = "Нет доступных комнат. Создайте первую!",
                            color = TextMuted
                        )
                    } else {
                        LazyColumn {
                            items(rooms) { room ->
                                RoomCard(room = room, onJoin = { onJoinRoom(room.id) })
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateRoomDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name, maxPlayers, mafia, commissioner, doctor ->
                showCreateDialog = false
                // TODO: Create room via socket
            }
        )
    }
}

@Composable
fun RoomCard(room: Room, onJoin: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onJoin),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = room.name, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(
                    text = "${room.players} / ${room.maxPlayers} игроков",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }

            Button(
                onClick = onJoin,
                colors = ButtonDefaults.buttonColors(containerColor = AccentSecondary)
            ) {
                Text("Войти")
            }
        }
    }
}

@Composable
fun CreateRoomDialog(
    onDismiss: () -> Unit,
    onCreate: (String, Int, Int, Int, Int) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var maxPlayers by remember { mutableStateOf(10) }
    var mafiaCount by remember { mutableStateOf(1) }
    var commissionerCount by remember { mutableStateOf(1) }
    var doctorCount by remember { mutableStateOf(1) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Новая комната") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Название") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text("Максимум игроков: $maxPlayers", color = TextSecondary)
                Slider(
                    value = maxPlayers.toFloat(),
                    onValueChange = { maxPlayers = it.toInt() },
                    valueRange = 5f..10f,
                    colors = SliderDefaults.colors(
                        thumbColor = AccentPrimary,
                        activeTrackColor = AccentPrimary
                    )
                )

                Text("Мафия: $mafiaCount", color = TextSecondary)
                Slider(
                    value = mafiaCount.toFloat(),
                    onValueChange = { mafiaCount = it.toInt() },
                    valueRange = 1f..(maxPlayers / 3).toFloat(),
                    colors = SliderDefaults.colors(
                        thumbColor = Danger,
                        activeTrackColor = Danger
                    )
                )

                Text("Шериф: $commissionerCount", color = TextSecondary)
                Slider(
                    value = commissionerCount.toFloat(),
                    onValueChange = { commissionerCount = it.toInt() },
                    valueRange = 0f..3f,
                    colors = SliderDefaults.colors(
                        thumbColor = Warning,
                        activeTrackColor = Warning
                    )
                )

                Text("Врач: $doctorCount", color = TextSecondary)
                Slider(
                    value = doctorCount.toFloat(),
                    onValueChange = { doctorCount = it.toInt() },
                    valueRange = 0f..3f,
                    colors = SliderDefaults.colors(
                        thumbColor = Success,
                        activeTrackColor = Success
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(name, maxPlayers, mafiaCount, commissionerCount, doctorCount) },
                colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)
            ) {
                Text("Создать")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Отмена", color = TextSecondary)
            }
        }
    )
}
