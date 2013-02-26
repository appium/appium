package io.appium.android.bootstrap;

import java.net.ServerSocket;
import java.net.Socket;
import java.io.PrintWriter;
import java.io.BufferedReader;
import java.io.InputStreamReader;
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
    Socket client;
    BufferedReader in;
    PrintWriter out;

    public SocketServer(int port) throws SocketServerException {
        try {
            server = new ServerSocket(port);
            Logger.info("Socket opened on port " + port);
        } catch (IOException e) {
            throw new SocketServerException("Could not start socket server listening on " + port);
        }
    }

    public void listenForever() throws SocketServerException {
        Logger.info("Appium Socket Server Ready");
        while (true) {
            try {
                client = server.accept();
                Logger.info("Client connected");
                handleClientData();
                client.close();
                Logger.info("Closed client connection");
            } catch (IOException e) {
                throw new SocketServerException("Error when client was trying to connect");
            }
        }
    }

    private void handleClientData() throws SocketServerException {
        String input = "";
        String inputLine = "";
        char a;
        try {
            in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            out = new PrintWriter(client.getOutputStream(), true);
            while ((a = (char) in.read()) != -1 && in.ready()) {
                input += a;
            }
            Logger.info("Got data from client: " + input);
            out.write(input);
            out.flush();
            in.close();
            out.close();
        } catch (IOException e) {
            throw new SocketServerException("Error processing data to/from socket (" + e.toString() + ")");
        }
    }
}
