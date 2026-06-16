package com.mafia.online.ui.screens.banned

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun BannedScreen(reason: String?, until: String?) {
    val formattedTime = until?.let {
        try {
            val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(it)
            val now = Date()
            val diff = date.time - now.time
            when {
                diff <= 0 -> "Истёк"
                diff < 60000 -> "${diff / 1000} секунд"
                diff < 3600000 -> "${diff / 60000} минут"
                diff < 86400000 -> "${diff / 3600000} часов"
                else -> "${diff / 86400000} дней"
            }
        } catch (e: Exception) {
            "Неизвестно"
        }
    } ?: "Навсегда"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(BackgroundDark, SurfaceDark)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .widthIn(max = 400.dp)
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "🔒", fontSize = 64.sp)

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Вы забанены",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Danger
                )

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        if (reason != null) {
                            Text(
                                text = "Причина: $reason",
                                fontSize = 16.sp,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        Text(
                            text = "Срок: $formattedTime",
                            fontSize = 16.sp,
                            color = Warning
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Если вы считаете, что это ошибка, обратитесь к администратору.",
                    color = TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
