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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.model.Player
import com.mafia.online.data.model.User
import com.mafia.online.data.socket.SocketManager
import com.mafia.online.ui.theme.*
import org.json.JSONObject

@Composable
fun GameScreen(
    user: User,
    token: String,
    roomId: String,
    onLeave: () -> Unit,
    onBanned: (String?, String?) -> Unit
) {
    val socketManager = remember { SocketManager() }
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
    var nightResult by remember { mutableStateOf<String?>(null) }
    var voteResult by remember { mutableStateOf<String?>(null) }
    var gameWinner by remember { mutableStateOf<String?>(null) }

    val roleNames = mapOf("mafia" to "Мафия", "commissioner" to "Шериф", "doctor" to "Врач", "civilian" to "Мирный")
    val roleIcons = mapOf("mafia" to "🗡️", "commissioner" to "🔍", "doctor" to "💊", "civilian" to "👤")
    val roleColors = mapOf("mafia" to Danger, "commissioner" to Warning, "doctor" to Success, "civilian" to TextPrimary)

    LaunchedEffect(Unit) {
        socketManager.connect("https://mafia-server-eljy.onrender.com", token)

        socketManager.emit("join-room", JSONObject().put("roomId", roomId.toInt())) {}

        socketManager.emit("get-role", JSONObject().put("roomId", roomId.toInt())) { res ->
            if (res.has("role")) {
                role = res.getString("role")
                isAlive = res.optBoolean("isAlive", true)
            }
        }

        socketManager.emit("get-players", JSONObject().put("roomId", roomId.toInt())) { res ->
            val arr = res.optJSONArray("players")
            if (arr != null) {
                val list = mutableListOf<Player>()
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    list.add(Player(
                        id = p.getInt("id"),
                        nickname = p.getString("nickname"),
                        avatar = p.optString("avatar", null),
                        role = p.optString("role", null),
                        isAlive = p.optBoolean("isAlive", true),
                        isHost = p.optBoolean("isHost", false)
                    ))
                }
                players = list
                val me = list.find { it.id == user.id }
                if (me != null) isHost = me.isHost
            }
        }

        socketManager.on("room-updated") { data ->
            val arr = data.optJSONArray("players")
            if (arr != null) {
                val list = mutableListOf<Player>()
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    list.add(Player(
                        id = p.getInt("id"),
                        nickname = p.getString("nickname"),
                        avatar = p.optString("avatar", null),
                        isAlive = true,
                        isHost = p.optBoolean("isHost", false)
                    ))
                }
                players = list
                val me = list.find { it.id == user.id }
                if (me != null) isHost = me.isHost
            }
        }

        socketManager.on("game-started") {
            phase = "night"
            dayNumber = 1
            actionMade = false
            nightResult = null
            voteResult = null
            gameWinner = null
            socketManager.emit("get-role", JSONObject().put("roomId", roomId.toInt())) { res ->
                if (res.has("role")) { role = res.getString("role"); isAlive = res.optBoolean("isAlive", true) }
            }
            socketManager.emit("get-players", JSONObject().put("roomId", roomId.toInt())) { res ->
                val arr = res.optJSONArray("players")
                if (arr != null) {
                    val list = mutableListOf<Player>()
                    for (i in 0 until arr.length()) {
                        val p = arr.getJSONObject(i)
                        list.add(Player(p.getInt("id"), p.getString("nickname"), p.optString("avatar", null), p.optString("role", null), p.optBoolean("isAlive", true)))
                    }
                    players = list
                }
            }
        }

        socketManager.on("phase-change") { data ->
            phase = data.getString("phase")
            dayNumber = data.getInt("dayNumber")
            selectedTarget = null
            actionMade = false
            nightResult = null
            voteResult = null
        }

        socketManager.on("night-result") { data ->
            val killed = data.optString("killedNickname", null)
            nightResult = if (killed != null) "💀 $killed был убит" else "Ночь прошла спокойно"
        }

        socketManager.on("vote-result") { data ->
            val eliminated = data.optString("eliminatedNickname", null)
            voteResult = if (eliminated != null) "🗳️ $eliminated исключён" else "Никто не исключён"
        }

        socketManager.on("game-ended") { data ->
            gameWinner = data.optString("winner")
            phase = "ended"
        }

        socketManager.on("player-kicked") { data ->
            if (data.optInt("userId") == user.id) {
                error = "Вы выгнаны"
            }
        }

        socketManager.on("player-banned") { data ->
            if (data.optInt("userId") == user.id) {
                onBanned(data.optString("reason"), data.optString("until"))
            }
        }
    }

    DisposableEffect(Unit) { onDispose { socketManager.disconnect() } }

    val alivePlayers = players.filter { it.isAlive && it.id != user.id }

    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark)))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Комната #$roomId", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (phase != "waiting" && phase != "ended") {
                        val phaseText = if (phase == "night") "🌙 Ночь" else "☀️ День"
                        Text("$phaseText — День $dayNumber", color = TextMuted)
                    }
                }
                Button(onClick = onLeave, colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)) { Text("Покинуть") }
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
                    Text("Игроки (${players.count { it.isAlive }})", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyColumn { items(players) { player -> PlayerCard(player, player.id == user.id) } }
                }
            }

            if (phase == "waiting" && isHost && ((user.isAdmin && players.size >= 2) || (!user.isAdmin && players.size >= 5))) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = {
                    socketManager.emit("start-game", JSONObject().put("roomId", roomId.toInt())) { res ->
                        if (res.has("error")) error = res.getString("error")
                    }
                }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) {
                    Text(if (user.isAdmin) "👑 Начать (${players.size})" else "Начать игру (${players.size})")
                }
            }

            if (phase == "night" && isAlive && !actionMade && role == "mafia") {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Выберите цель:", fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        alivePlayers.forEach { p ->
                            Button(onClick = {
                                selectedTarget = p.id
                                actionMade = true
                                socketManager.emit("mafia-kill", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {}
                            }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Danger)) {
                                Text(p.nickname)
                            }
                        }
                    }
                }
            }

            if (phase == "night" && isAlive && !actionMade && role == "commissioner") {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Кого проверить?", fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        alivePlayers.forEach { p ->
                            Button(onClick = {
                                selectedTarget = p.id
                                actionMade = true
                                socketManager.emit("commissioner-check", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {}
                            }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Warning)) {
                                Text(p.nickname)
                            }
                        }
                    }
                }
            }

            if (phase == "night" && isAlive && !actionMade && role == "doctor") {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Кого лечить?", fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        players.filter { it.isAlive }.forEach { p ->
                            Button(onClick = {
                                selectedTarget = p.id
                                actionMade = true
                                socketManager.emit("doctor-heal", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {}
                            }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Success)) {
                                Text("${p.nickname}${if (p.id == user.id) " (Вы)" else ""}")
                            }
                        }
                    }
                }
            }

            if (phase == "day" && isAlive && !actionMade) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Голосование:", fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        alivePlayers.forEach { p ->
                            Button(onClick = {
                                selectedTarget = p.id
                                actionMade = true
                                socketManager.emit("day-vote", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {}
                            }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = AccentSecondary)) {
                                Text(p.nickname)
                            }
                        }
                        Button(onClick = {
                            actionMade = true
                            socketManager.emit("day-vote", JSONObject().put("roomId", roomId.toInt()).put("targetId", JSONObject.NULL)) {}
                        }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)) {
                            Text("Не голосовать")
                        }
                    }
                }
            }

            nightResult?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.15f))) { Text(it, modifier = Modifier.padding(12.dp), color = TextPrimary) }
            }
            voteResult?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Warning.copy(alpha = 0.15f))) { Text(it, modifier = Modifier.padding(12.dp), color = TextPrimary) }
            }

            gameWinner?.let { winner ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = if (winner == "town") Success.copy(alpha = 0.15f) else Danger.copy(alpha = 0.15f))) {
                    Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(if (winner == "town") "🎉 Мирные победили!" else "🗡️ Мафия победила!", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        players.forEach { p ->
                            Text("${p.nickname}: ${roleNames[p.role] ?: p.role}", color = roleColors[p.role] ?: TextSecondary, fontSize = 14.sp)
                        }
                    }
                }
            }

            role?.let { r ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(roleIcons[r] ?: "", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Ваша роль: ${roleNames[r]}", fontWeight = FontWeight.Bold, color = roleColors[r] ?: TextPrimary)
                        }
                    }
                }
            }

            if (actionMade && phase != "ended") {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Ожидание других игроков...", color = TextMuted, modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
    }
}

@Composable
fun PlayerCard(player: Player, isCurrentUser: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrentUser) AccentPrimary.copy(alpha = 0.3f) else if (!player.isAlive) Danger.copy(alpha = 0.2f) else SurfaceDark
        )
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("${player.nickname}${if (isCurrentUser) " (Вы)" else ""}", color = if (player.isAlive) TextPrimary else TextMuted)
            if (!player.isAlive) Text("💀")
        }
    }
}
