package io.appium.android.bootstrap;

import java.net.ServerSocket;
import java.net.Socket;
import java.io.IOException;

import io.appium.android.bootstrap.Logger;

class SocketServerException extends Exception {
    
    String reason;
    
    public SocketServerException(String msg) {
        super(msg);
        reason = msg;
    }
    
    public String getError() {
        return reason;
    }
}

class SocketServer {
    
    ServerSocket server;
    
    public SocketServer(int port) throws SocketServerException {
        try {
            server = new ServerSocket(port);
            Logger.info("Socket opened on port " + port);
        } catch (IOException e) {
            throw new SocketServerException("Could not start socket server listening on " + port);
        }
    }
    
    public void listenForever() throws SocketServerException {
        Logger.info("Listening forever, in a JUnit test, like, wut?...");
        Socket client;
        try {
            client = server.accept();
        } catch (IOException e) {
            throw new SocketServerException("Error when client was trying to connect");
        }
    }
}
