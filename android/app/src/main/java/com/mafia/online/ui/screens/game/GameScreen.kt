package com.mafia.online.ui.screens.game

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.mafia.online.data.socket.SocketManager
import com.mafia.online.ui.theme.*
import org.json.JSONObject

@Composable
fun GameScreen(user: User, token: String, roomId: String, onLeave: () -> Unit, onBanned: (String?, String?) -> Unit) {
    val sm = remember { SocketManager() }
    var players by remember { mutableStateOf(listOf<Player>()) }
    var role by remember { mutableStateOf<String?>(null) }
    var isAlive by remember { mutableStateOf(true) }
    var phase by remember { mutableStateOf("waiting") }
    var day by remember { mutableStateOf(0) }
    var isHost by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var actionMade by remember { mutableStateOf(false) }
    var nightResult by remember { mutableStateOf<String?>(null) }
    var voteResult by remember { mutableStateOf<String?>(null) }
    var winner by remember { mutableStateOf<String?>(null) }
    var checkResult by remember { mutableStateOf<String?>(null) }
    var selectedProfile by remember { mutableStateOf<User?>(null) }
    var timeLeft by remember { mutableStateOf(0) }

    val roleNames = mapOf("mafia" to "Мафия", "commissioner" to "Шериф", "doctor" to "Врач", "don" to "Дона", "civilian" to "Мирный")
    val roleIcons = mapOf("mafia" to "🗡️", "commissioner" to "🔍", "doctor" to "💊", "don" to "🍷", "civilian" to "👤")
    val roleColors = mapOf("mafia" to Danger, "commissioner" to Warning, "doctor" to Success, "don" to Color(0xFF8B4513), "civilian" to TextPrimary)

    fun loadPlayers() {
        sm.emit("get-players", JSONObject().put("roomId", roomId.toInt())) { res ->
            val arr = res.optJSONArray("players")
            if (arr != null) {
                val list = mutableListOf<Player>()
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    list.add(Player(p.getInt("id"), p.getString("nickname"), p.optString("avatar", null), p.optString("role", null), p.optBoolean("isAlive", true), p.optBoolean("isHost", false)))
                }
                players = list
                val me = list.find { it.id == user.id }
                isHost = me?.isHost == true
            }
        }
    }

    LaunchedEffect(Unit) {
        sm.connect("https://mafia-server-eljy.onrender.com", token)
        sm.emit("join-room", JSONObject().put("roomId", roomId.toInt())) {}
        sm.emit("get-role", JSONObject().put("roomId", roomId.toInt())) { r -> if (r.has("role")) { role = r.getString("role"); isAlive = r.optBoolean("isAlive", true) } }
        loadPlayers()

        sm.on("room-updated") { d ->
            val arr = d.optJSONArray("players")
            if (arr != null) {
                val list = mutableListOf<Player>()
                for (i in 0 until arr.length()) { val p = arr.getJSONObject(i); list.add(Player(p.getInt("id"), p.getString("nickname"), p.optString("avatar", null), null, true, p.optBoolean("isHost", false))) }
                players = list; val me = list.find { it.id == user.id }; isHost = me?.isHost == true
            }
        }
        sm.on("game-started") { phase = "night"; day = 1; actionMade = false; nightResult = null; voteResult = null; winner = null; checkResult = null; sm.emit("get-role", JSONObject().put("roomId", roomId.toInt())) { r -> if (r.has("role")) { role = r.getString("role"); isAlive = r.optBoolean("isAlive", true) } }; loadPlayers() }
        sm.on("phase-change") { d -> phase = d.getString("phase"); day = d.getInt("dayNumber"); actionMade = false; nightResult = null; voteResult = null; checkResult = null; loadPlayers() }
        sm.on("night-result") { d -> nightResult = d.optString("killedNickname", null)?.let { "💀 $it был убит" } ?: "Ночь спокойна"; loadPlayers() }
        sm.on("vote-result") { d -> voteResult = d.optString("eliminatedNickname", null)?.let { "🗳️ $it исключён" } ?: "Никто не исключён"; loadPlayers() }
        sm.on("game-ended") { d -> winner = d.optString("winner"); phase = "ended" }
        sm.on("check-result") { d -> val target = players.find { it.id == d.optInt("targetId") }; checkResult = "🔍 ${target?.nickname}: ${if (d.optBoolean("isMafia")) "МАФИЯ" else "не мафия"}" }
        sm.on("don-check-result") { d -> val target = players.find { it.id == d.optInt("targetId") }; checkResult = "🍷 ${target?.nickname}: ${if (d.optBoolean("isSheriff")) "ШЕРИФ" else "не шериф"}" }
        sm.on("player-kicked") { d -> if (d.optInt("userId") == user.id) error = "Вы выгнаны" }
        sm.on("player-banned") { d -> if (d.optInt("userId") == user.id) onBanned(d.optString("reason"), d.optString("until")) }
        sm.on("timer-tick") { d -> timeLeft = d.optInt("timeLeft", 0) }
    }

    DisposableEffect(Unit) { onDispose { sm.disconnect() } }

    val alive = players.filter { it.isAlive && it.id != user.id }

    if (selectedProfile != null) {
        ProfileDialog(profile = selectedProfile!!, onDismiss = { selectedProfile = null })
    }

    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark)))) {
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Комната #$roomId", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (phase != "waiting" && phase != "ended") {
                        val phaseText = if (phase == "night") "🌙 Ночь" else "☀️ День"
                        Text("$phaseText — День $day", color = TextMuted)
                        if (timeLeft > 0) Text("${timeLeft / 60}:${(timeLeft % 60).toString().padStart(2, '0')}", color = if (timeLeft <= 10) Danger else if (timeLeft <= 30) Warning else TextSecondary)
                    }
                }
                Button(onClick = onLeave, colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)) { Text("Покинуть") }
            }

            Spacer(modifier = Modifier.height(16.dp))
            if (error.isNotEmpty()) { Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.2f))) { Text(error, modifier = Modifier.padding(12.dp), color = Danger) } }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = CardDark)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Игроки (${players.count { it.isAlive }})", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    players.forEach { p ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { selectedProfile = User(p.id, p.nickname) },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(roleIcons[p.role] ?: "👤", fontSize = 20.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("${p.nickname}${if (p.id == user.id) " (Вы)" else ""}", color = if (p.isAlive) TextPrimary else TextMuted)
                                    if (!p.isAlive) Text("💀 Мёртв", fontSize = 12.sp, color = Danger)
                                }
                            }
                            if (p.isHost) Text("⭐", fontSize = 16.sp)
                        }
                    }
                }
            }

            if (phase == "waiting" && isHost && ((user.isAdmin && players.size >= 2) || (!user.isAdmin && players.size >= 5))) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { sm.emit("start-game", JSONObject().put("roomId", roomId.toInt())) { if (it.has("error")) error = it.getString("error") } }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary)) { Text("Начать (${players.size})") }
            }

            if (phase == "night" && isAlive && !actionMade) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        when (role) {
                            "mafia" -> { Text("🗡️ Выберите цель:", fontWeight = FontWeight.Bold, color = TextPrimary); alive.forEach { p -> Button({ actionMade = true; sm.emit("mafia-kill", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Danger)) { Text(p.nickname) } } }
                            "commissioner" -> { Text("🔍 Кого проверить?", fontWeight = FontWeight.Bold, color = TextPrimary); alive.forEach { p -> Button({ actionMade = true; sm.emit("commissioner-check", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Warning)) { Text(p.nickname) } } }
                            "doctor" -> { Text("💊 Кого лечить?", fontWeight = FontWeight.Bold, color = TextPrimary); players.filter { it.isAlive }.forEach { p -> Button({ actionMade = true; sm.emit("doctor-heal", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("${p.nickname}${if (p.id == user.id) " (Вы)" else ""}") } } }
                            "don" -> { Text("🍷 Кого проверить?", fontWeight = FontWeight.Bold, color = TextPrimary); alive.forEach { p -> Button({ actionMade = true; sm.emit("don-check", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B4513))) { Text(p.nickname) } } }
                        }
                    }
                }
            }

            if (phase == "day" && isAlive && !actionMade) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("🗳️ Голосование:", fontWeight = FontWeight.Bold, color = TextPrimary)
                        alive.forEach { p -> Button({ actionMade = true; sm.emit("day-vote", JSONObject().put("roomId", roomId.toInt()).put("targetId", p.id)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = AccentSecondary)) { Text(p.nickname) } }
                        Button({ actionMade = true; sm.emit("day-vote", JSONObject().put("roomId", roomId.toInt()).put("targetId", JSONObject.NULL)) {} }, Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)) { Text("Не голосовать") }
                    }
                }
            }

            checkResult?.let { Spacer(modifier = Modifier.height(8.dp)); Card(colors = CardDefaults.cardColors(containerColor = AccentPrimary.copy(alpha = 0.15f))) { Text(it, modifier = Modifier.padding(12.dp), color = TextPrimary) } }
            nightResult?.let { Spacer(modifier = Modifier.height(8.dp)); Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.15f))) { Text(it, modifier = Modifier.padding(12.dp), color = TextPrimary) } }
            voteResult?.let { Spacer(modifier = Modifier.height(8.dp)); Card(colors = CardDefaults.cardColors(containerColor = Warning.copy(alpha = 0.15f))) { Text(it, modifier = Modifier.padding(12.dp), color = TextPrimary) } }

            winner?.let { w -> Spacer(modifier = Modifier.height(16.dp)); Card(colors = CardDefaults.cardColors(containerColor = if (w == "town") Success.copy(alpha = 0.15f) else Danger.copy(alpha = 0.15f))) { Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(if (w == "town") "🎉 Мирные победили!" else "🗡️ Мафия победила!", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary); Spacer(modifier = Modifier.height(8.dp)); players.forEach { p -> Text("${p.nickname}: ${roleNames[p.role] ?: p.role}", color = roleColors[p.role] ?: TextSecondary, fontSize = 14.sp) } } } }

            role?.let { r -> Spacer(modifier = Modifier.height(16.dp)); Card(colors = CardDefaults.cardColors(containerColor = CardDark)) { Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Text(roleIcons[r] ?: "", fontSize = 24.sp); Spacer(modifier = Modifier.width(8.dp)); Text("Ваша роль: ${roleNames[r]}", fontWeight = FontWeight.Bold, color = roleColors[r] ?: TextPrimary) } } }

            if (actionMade && phase != "ended") { Spacer(modifier = Modifier.height(8.dp)); Text("Ожидание...", color = TextMuted, modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center) }
        }
    }
}

@Composable
fun ProfileDialog(profile: User, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(profile.nickname, fontWeight = FontWeight.Bold, color = TextPrimary) },
        text = {
            Column {
                Text("Логин: ${profile.login}", color = TextSecondary)
                Text("Игр: ${profile.gamesPlayed} | Побед: ${profile.wins} | Поражений: ${profile.losses}", color = TextMuted)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Закрыть", color = AccentSecondary) } }
    )
}
