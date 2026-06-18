package com.mafia.online.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
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
fun AdminScreen(user: User, token: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val api = remember { Retrofit.Builder().baseUrl("https://mafia-server-eljy.onrender.com/").addConverterFactory(GsonConverterFactory.create()).build().create(ApiService::class.java) }
    var users by remember { mutableStateOf(listOf<User>()) }
    var error by remember { mutableStateOf("") }
    var success by remember { mutableStateOf("") }
    var banDialog by remember { mutableStateOf<User?>(null) }
    var banReason by remember { mutableStateOf("") }
    var banDuration by remember { mutableStateOf("permanent") }

    LaunchedEffect(Unit) {
        try { users = api.getAdminUsers("Bearer $token") } catch (_: Exception) {}
    }

    if (!user.isAdmin) {
        Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark))), contentAlignment = Alignment.Center) {
            Text("Доступ запрещён", color = TextMuted)
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark))).padding(16.dp)) {
        Text("Админ-панель", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(16.dp))
        if (error.isNotEmpty()) Text(error, color = Danger)
        if (success.isNotEmpty()) Text(success, color = Success)
        LazyColumn {
            items(users) { u ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = CardDefaults.cardColors(containerColor = if (u.isBanned) Danger.copy(alpha = 0.15f) else CardDark)) {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text(u.nickname, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("Игр: ${u.gamesPlayed} | Побед: ${u.wins}", color = TextMuted, fontSize = 12.sp)
                            if (u.isBanned) Text("🔒 Забанен", color = Danger, fontSize = 12.sp)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (!u.isAdmin) {
                                if (u.isBanned) {
                                    Button(onClick = { scope.launch { try { api.unbanUser("Bearer $token", u.id); users = api.getAdminUsers("Bearer $token"); success = "${u.nickname} разбанен" } catch (_: Exception) {} } }, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("Разбан", fontSize = 12.sp) }
                                } else {
                                    Button(onClick = { banDialog = u }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) { Text("Бан", fontSize = 12.sp) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    banDialog?.let { target ->
        AlertDialog(
            onDismissRequest = { banDialog = null },
            title = { Text("Бан: ${target.nickname}") },
            text = {
                Column {
                    OutlinedTextField(value = banReason, onValueChange = { banReason = it }, label = { Text("Причина") }, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Срок:", color = TextSecondary)
                    listOf("1m" to "1 минута", "5m" to "5 минут", "1h" to "1 час", "1d" to "1 день", "permanent" to "Навсегда").forEach { (value, label) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                            RadioButton(selected = banDuration == value, onClick = { banDuration = value })
                            Text(label, color = TextPrimary)
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        try {
                            val dur = when(banDuration) { "1m" -> "60"; "5m" -> "300"; "1h" -> "3600"; "1d" -> "86400"; else -> "permanent" }
                            api.banUser("Bearer $token", target.id, mapOf("reason" to banReason.ifEmpty { null }, "duration" to dur))
                            users = api.getAdminUsers("Bearer $token")
                            success = "${target.nickname} забанен"
                            banDialog = null; banReason = ""; banDuration = "permanent"
                        } catch (_: Exception) {}
                    }
                }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) { Text("Забанить") }
            },
            dismissButton = { TextButton(onClick = { banDialog = null }) { Text("Отмена", color = TextSecondary) } }
        )
    }
}
