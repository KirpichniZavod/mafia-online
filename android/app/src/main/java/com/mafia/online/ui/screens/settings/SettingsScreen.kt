package com.mafia.online.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.ui.theme.*

@Composable
fun SettingsScreen(
    currentTheme: String,
    onThemeChange: (String) -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(BackgroundDark, SurfaceDark))).padding(16.dp)
    ) {
        Text("Настройки", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(24.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Тема оформления", fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ThemeButton("🌙 Тёмная", "dark", currentTheme, onThemeChange)
                    ThemeButton("☀️ Светлая", "light", currentTheme, onThemeChange)
                    ThemeButton("🍋 Лимонная", "lemon", currentTheme, onThemeChange)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("О приложении", fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Мафия Онлайн v1.0", color = TextSecondary)
                Text("Разработчик: Anubis", color = TextMuted, fontSize = 14.sp)
            }
        }
    }
}

@Composable
fun ThemeButton(label: String, theme: String, currentTheme: String, onThemeChange: (String) -> Unit) {
    val isSelected = currentTheme == theme
    Button(
        onClick = { onThemeChange(theme) },
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) AccentPrimary else SurfaceDark
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(label, color = if (isSelected) TextPrimary else TextMuted)
    }
}
