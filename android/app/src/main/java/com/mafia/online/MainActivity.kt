package com.mafia.online

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.mafia.online.ui.navigation.MafiaNavGraph
import com.mafia.online.ui.theme.MafiaOnlineTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var theme by remember { mutableStateOf("dark") }

            MafiaOnlineTheme(darkTheme = theme == "dark") {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MafiaNavGraph(
                        startTheme = theme,
                        onThemeChange = { newTheme -> theme = newTheme }
                    )
                }
            }
        }
    }
}
