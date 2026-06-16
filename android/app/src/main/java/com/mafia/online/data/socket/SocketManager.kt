package com.mafia.online.data.socket

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocketManager @Inject constructor() {

    private var socket: Socket? = null

    fun connect(serverUrl: String, token: String) {
        val opts = IO.Options.builder()
            .setAuth(mapOf("token" to token))
            .build()

        socket = IO.socket(serverUrl, opts)
        socket?.connect()
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun isConnected(): Boolean = socket?.connected() == true

    fun on(event: String, handler: Emitter.Listener) {
        socket?.on(event, handler)
    }

    fun off(event: String) {
        socket?.off(event)
    }

    fun emit(event: String, vararg args: Any) {
        socket?.emit(event, *args)
    }

    fun emitWithCallback(event: String, callback: (JSONObject) -> Unit, vararg args: Any) {
        socket?.emit(event, object : Emitter.Listener {
            override fun call(vararg args: Any?) {
                val response = args.firstOrNull() as? JSONObject
                response?.let { callback(it) }
            }
        }, *args)
    }
}
