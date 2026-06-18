package com.mafia.online.data.socket

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI

class SocketManager {

    private var socket: Socket? = null

    fun connect(serverUrl: String, token: String) {
        val uri = URI.create(serverUrl)
        val opts = IO.Options()
        opts.query = mapOf("token" to token)
        socket = IO.socket(uri, opts)
        socket?.connect()
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
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
            socket?.emit(event, object : Emitter.Listener {
                override fun call(vararg args: Any?) {
                    val response = args.firstOrNull() as? JSONObject
                    if (response != null) callback(response)
                }
            }, data)
        } else {
            socket?.emit(event, data)
        }
    }
}
