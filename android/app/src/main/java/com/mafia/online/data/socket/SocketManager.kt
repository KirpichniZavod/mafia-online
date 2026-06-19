package com.mafia.online.data.socket

import io.socket.client.Ack
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI

class SocketManager {
    private var socket: Socket? = null
    private var connectHandler: (() -> Unit)? = null
    private var disconnectHandler: (() -> Unit)? = null

    fun connect(serverUrl: String, token: String) {
        try {
            val uri = URI.create("$serverUrl?token=$token")
            socket = IO.socket(uri)

            socket?.on(Socket.EVENT_CONNECT) {
                connectHandler?.invoke()
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                disconnectHandler?.invoke()
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val error = args.firstOrNull() as? Exception
                println("Socket error: ${error?.message}")
            }

            socket?.connect()
        } catch (e: Exception) {
            println("Connect error: ${e.message}")
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun onConnect(handler: () -> Unit) {
        connectHandler = handler
    }

    fun onDisconnect(handler: () -> Unit) {
        disconnectHandler = handler
    }

    fun on(event: String, handler: (JSONObject) -> Unit) {
        socket?.on(event, object : Emitter.Listener {
            override fun call(vararg args: Any?) {
                val data = args.firstOrNull() as? JSONObject
                if (data != null) handler(data)
            }
        })
    }

    fun emit(event: String, data: JSONObject, callback: ((JSONObject) -> Unit)? = null) {
        if (callback != null) {
            socket?.emit(event, data, object : Ack {
                override fun call(vararg args: Any?) {
                    val response = args.firstOrNull() as? JSONObject
                    if (response != null) callback(response)
                }
            })
        } else {
            socket?.emit(event, data)
        }
    }
}
