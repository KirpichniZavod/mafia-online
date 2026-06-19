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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
fun LobbyScreen(
    user: User,
    token: String,
    onJoinRoom: (Int) -> Unit
) {
    val socketManager = remember { SocketManager() }
    var rooms by remember { mutableStateOf(listOf<Room>()) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    fun parseRooms(response: JSONObject) {
        val arr = response.optJSONArray("rooms")
        if (arr != null) {
            val list = mutableListOf<Room>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(Room(
                    id = obj.getInt("id"),
                    name = obj.getString("name"),
                    players = obj.getInt("players"),
                    maxPlayers = obj.getInt("maxPlayers")
                ))
            }
            rooms = list
        }
    }

    LaunchedEffect(Unit) {
        socketManager.connect("https://mafia-server-eljy.onrender.com", token)
        socketManager.on("room-created") { socketManager.emit("get-rooms", JSONObject(), ::parseRooms) }
        socketManager.on("room-deleted") { socketManager.emit("get-rooms", JSONObject(), ::parseRooms) }
        socketManager.emit("get-rooms", JSONObject(), ::parseRooms)
    }

    DisposableEffect(Unit) { onDispose { socketManager.disconnect() } }

    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark)))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Лобби", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Button(onClick = { showCreateDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) { Text("Создать комнату") }
            }
            Spacer(modifier = Modifier.height(16.dp))
            if (error.isNotEmpty()) Text(error, color = Danger)
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = CardDark)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Доступные комнаты", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    if (rooms.isEmpty()) Text("Нет доступных комнат", color = TextMuted)
                    else LazyColumn { items(rooms) { room -> RoomCard(room) { socketManager.emit("join-room", JSONObject().put("roomId", room.id)) { if (it.optBoolean("success")) onJoinRoom(room.id) else error = it.optString("error", "Ошибка") } } } }
                }
            }
        }
    }

    if (showCreateDialog) {
        var dlgName by remember { mutableStateOf("") }
        var dlgMax by remember { mutableStateOf(10) }
        var dlgMafia by remember { mutableStateOf(1) }
        var dlgSheriff by remember { mutableStateOf(1) }
        var dlgDoctor by remember { mutableStateOf(1) }
        var dlgDon by remember { mutableStateOf(0) }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Новая комната") },
            text = {
                Column {
                    OutlinedTextField(value = dlgName, onValueChange = { dlgName = it }, label = { Text("Название") }, modifier = Modifier.fillMaxWidth())
                    Text("Макс: $dlgMax", color = TextSecondary); Slider(dlgMax.toFloat(), { dlgMax = it.toInt() }, valueRange = 5f..10f, colors = SliderDefaults.colors(thumbColor = AccentPrimary, activeTrackColor = AccentPrimary))
                    Text("Мафия: $dlgMafia", color = TextSecondary); Slider(dlgMafia.toFloat(), { dlgMafia = it.toInt() }, valueRange = 1f..(dlgMax/3).toFloat(), colors = SliderDefaults.colors(thumbColor = Danger, activeTrackColor = Danger))
                    Text("Шериф: $dlgSheriff", color = TextSecondary); Slider(dlgSheriff.toFloat(), { dlgSheriff = it.toInt() }, valueRange = 0f..3f, colors = SliderDefaults.colors(thumbColor = Warning, activeTrackColor = Warning))
                    Text("Врач: $dlgDoctor", color = TextSecondary); Slider(dlgDoctor.toFloat(), { dlgDoctor = it.toInt() }, valueRange = 0f..3f, colors = SliderDefaults.colors(thumbColor = Success, activeTrackColor = Success))
                    Text("Дон: $dlgDon", color = TextSecondary); Slider(dlgDon.toFloat(), { dlgDon = it.toInt() }, valueRange = 0f..2f, colors = SliderDefaults.colors(thumbColor = Color(0xFF8B4513), activeTrackColor = Color(0xFF8B4513)))
                }
            },
            confirmButton = {
                Button(onClick = {
                    showCreateDialog = false
                    socketManager.emit("create-room", JSONObject().put("name", dlgName).put("maxPlayers", dlgMax).put("mafiaCount", dlgMafia).put("commissionerCount", dlgSheriff).put("doctorCount", dlgDoctor).put("donCount", dlgDon)) {}
                }, colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) { Text("Создать") }
            },
            dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text("Отмена", color = TextSecondary) } }
        )
    }
}

@Composable
fun RoomCard(room: Room, onJoin: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onJoin), colors = CardDefaults.cardColors(containerColor = SurfaceDark)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column { Text(room.name, fontWeight = FontWeight.Bold, color = TextPrimary); Text("${room.players}/${room.maxPlayers}", color = TextSecondary, fontSize = 14.sp) }
            Button(onClick = onJoin, colors = ButtonDefaults.buttonColors(containerColor = AccentSecondary)) { Text("Войти") }
        }
    }
}
