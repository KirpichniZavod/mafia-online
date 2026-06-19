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
import com.mafia.online.data.socket.SocketManager
import com.mafia.online.ui.theme.*
import org.json.JSONObject

@Composable
fun LobbyScreen(user: User, token: String, onJoinRoom: (Int) -> Unit) {
    val socketManager = remember { SocketManager() }
    var rooms by remember { mutableStateOf(listOf<Room>()) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var connected by remember { mutableStateOf(false) }

    LaunchedEffect(token) {
        socketManager.connect("https://mafia-server-eljy.onrender.com", token)
        socketManager.onConnect { connected = true }
        socketManager.onDisconnect { connected = false }

        socketManager.on("room-created") {
            socketManager.emit("get-rooms", JSONObject()) { response ->
                parseRooms(response)?.let { rooms = it }
            }
        }
        socketManager.on("room-deleted") {
            socketManager.emit("get-rooms", JSONObject()) { response ->
                parseRooms(response)?.let { rooms = it }
            }
        }

        socketManager.emit("get-rooms", JSONObject()) { response ->
            parseRooms(response)?.let { rooms = it }
        }
    }

    DisposableEffect(Unit) {
        onDispose { socketManager.disconnect() }
    }

    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark)))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Привет, ${user.nickname}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!connected) Text("Подключение...", color = Warning, fontSize = 12.sp)
                    else Text("Онлайн", color = Success, fontSize = 12.sp)
                }
                Button(onClick = { showCreateDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) {
                    Text("Создать комнату")
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            if (error.isNotEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.2f))) {
                    Text(error, modifier = Modifier.padding(12.dp), color = Danger)
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = CardDark)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Комнаты", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    if (rooms.isEmpty()) {
                        Text("Нет комнат. Создайте первую!", color = TextMuted)
                    } else {
                        LazyColumn {
                            items(rooms) { room ->
                                RoomCard(room) {
                                    socketManager.emit("join-room", JSONObject().put("roomId", room.id)) { response ->
                                        if (response.optBoolean("success")) {
                                            onJoinRoom(room.id)
                                        } else {
                                            error = response.optString("error", "Ошибка")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateRoomDialog(
            socketManager = socketManager,
            onDismiss = { showCreateDialog = false },
            onError = { error = it; showCreateDialog = false }
        )
    }
}

private fun parseRooms(response: JSONObject): List<Room>? {
    val arr = response.optJSONArray("rooms") ?: return null
    val list = mutableListOf<Room>()
    for (i in 0 until arr.length()) {
        val obj = arr.getJSONObject(i)
        list.add(Room(obj.getInt("id"), obj.getString("name"), obj.getInt("players"), obj.getInt("maxPlayers")))
    }
    return list
}

@Composable
fun RoomCard(room: Room, onJoin: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onJoin), colors = CardDefaults.cardColors(containerColor = SurfaceDark)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(room.name, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text("${room.players}/${room.maxPlayers} игроков", color = TextSecondary, fontSize = 14.sp)
            }
            Button(onClick = onJoin, colors = ButtonDefaults.buttonColors(containerColor = AccentSecondary)) { Text("Войти") }
        }
    }
}

@Composable
fun CreateRoomDialog(socketManager: SocketManager, onDismiss: () -> Unit, onError: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var maxPlayers by remember { mutableStateOf(10) }
    var mafia by remember { mutableStateOf(1) }
    var sheriff by remember { mutableStateOf(1) }
    var doctor by remember { mutableStateOf(1) }
    var don by remember { mutableStateOf(0) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Новая комната") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Название") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Text("Макс: $maxPlayers", color = TextSecondary)
                Slider(maxPlayers.toFloat(), { maxPlayers = it.toInt() }, valueRange = 5f..10f, colors = SliderDefaults.colors(thumbColor = AccentPrimary, activeTrackColor = AccentPrimary))
                Text("Мафия: $mafia", color = TextSecondary)
                Slider(mafia.toFloat(), { mafia = it.toInt() }, valueRange = 1f..(maxPlayers / 3).toFloat(), colors = SliderDefaults.colors(thumbColor = Danger, activeTrackColor = Danger))
                Text("Шериф: $sheriff", color = TextSecondary)
                Slider(sheriff.toFloat(), { sheriff = it.toInt() }, valueRange = 0f..3f, colors = SliderDefaults.colors(thumbColor = Warning, activeTrackColor = Warning))
                Text("Врач: $doctor", color = TextSecondary)
                Slider(doctor.toFloat(), { doctor = it.toInt() }, valueRange = 0f..3f, colors = SliderDefaults.colors(thumbColor = Success, activeTrackColor = Success))
                Text("Дон: $don", color = TextSecondary)
                Slider(don.toFloat(), { don = it.toInt() }, valueRange = 0f..2f, colors = SliderDefaults.colors(thumbColor = Color(0xFF8B4513), activeTrackColor = Color(0xFF8B4513)))
            }
        },
        confirmButton = {
            Button(onClick = {
                if (name.isBlank()) { onError("Введите название"); return@Button }
                socketManager.emit("create-room", JSONObject()
                    .put("name", name)
                    .put("maxPlayers", maxPlayers)
                    .put("mafiaCount", mafia)
                    .put("commissionerCount", sheriff)
                    .put("doctorCount", doctor)
                    .put("donCount", don)
                ) { response ->
                    if (response.optBoolean("success")) {
                        onDismiss()
                    } else {
                        onError(response.optString("error", "Ошибка"))
                    }
                }
            }, colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) { Text("Создать") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена", color = TextSecondary) } }
    )
}
