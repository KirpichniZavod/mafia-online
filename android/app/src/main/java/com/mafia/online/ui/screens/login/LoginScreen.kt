package com.mafia.online.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafia.online.data.api.ApiService
import com.mafia.online.data.model.User
import com.mafia.online.data.repository.AuthRepository
import com.mafia.online.ui.screens.banned.BannedScreen
import com.mafia.online.ui.theme.*
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

@Composable
fun LoginScreen(
    onLogin: (User, String) -> Unit,
    onRegister: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val api = remember {
        Retrofit.Builder()
            .baseUrl("https://mafia-server-eljy.onrender.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
    val repository = remember { AuthRepository(api, context) }

    var login by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var banInfo by remember { mutableStateOf<Pair<String?, String?>?>(null) }

    if (banInfo != null) {
        BannedScreen(reason = banInfo!!.first, until = banInfo!!.second)
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(BackgroundDark, SurfaceDark, CardDark)
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
                Text(
                    text = "Вход в аккаунт",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = login,
                    onValueChange = { login = it },
                    label = { Text("Логин") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentPrimary,
                        unfocusedBorderColor = BorderColor,
                        focusedLabelColor = AccentSecondary,
                        cursorColor = AccentPrimary
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Пароль") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentPrimary,
                        unfocusedBorderColor = BorderColor,
                        focusedLabelColor = AccentSecondary,
                        cursorColor = AccentPrimary
                    )
                )

                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = error, color = Danger, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (login.isBlank() || password.isBlank()) return@Button
                        loading = true
                        error = ""
                        scope.launch {
                            try {
                                val response = api.login(mapOf("login" to login, "password" to password))
                                repository.saveToken(response.token)
                                onLogin(response.user, response.token)
                            } catch (e: retrofit2.HttpException) {
                                val body = e.response()?.errorBody()?.string()
                                if (body != null && body.contains("banned")) {
                                    error = "Вы забанены"
                                } else {
                                    error = "Неверный логин или пароль"
                                }
                            } catch (e: Exception) {
                                error = "Ошибка подключения"
                            }
                            loading = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary),
                    enabled = !loading && login.isNotBlank() && password.isNotBlank()
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Войти")
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(onClick = onRegister) {
                    Text(
                        text = "Нет аккаунта? Зарегистрироваться",
                        color = AccentSecondary
                    )
                }
            }
        }
    }
}
