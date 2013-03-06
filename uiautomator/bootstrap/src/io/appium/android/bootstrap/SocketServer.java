package io.appium.android.bootstrap;

import java.net.ServerSocket;
import java.net.Socket;
import java.io.PrintWriter;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import org.json.JSONException;

import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.AndroidCommand;

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
    boolean keepListening;

    public SocketServer(int port) throws SocketServerException {
        keepListening = true;
        try {
            server = new ServerSocket(port);
            Logger.info("Socket opened on port " + port);
        } catch (IOException e) {
            throw new SocketServerException("Could not start socket server listening on " + port);
        }
    }

    public void listenForever() throws SocketServerException {
        Logger.info("Appium Socket Server Ready");
        try {
            client = server.accept();
            Logger.info("Client connected");
            in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            out = new PrintWriter(client.getOutputStream(), true);
            while (keepListening) {
                handleClientData();
            }
            in.close();
            out.close();
            client.close();
            Logger.info("Closed client connection");
        } catch (IOException e) {
            throw new SocketServerException("Error when client was trying to connect");
        }
    }

    private void handleClientData() throws SocketServerException {
        String input = "";
        char a;
        AndroidCommand cmd;
        String res;
        try {
            while ((a = (char) in.read()) != -1 && in.ready()) {
                input += a;
            }
            Logger.info("Got data from client: " + input);
            try {
                cmd = getCommand(input);
                Logger.info("Got command of type " + cmd.commandType().toString());
                res = runCommand(cmd);
                Logger.info("Returning result: " + res);
            } catch (CommandTypeException e) {
                res = (new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage())).toString();
            } catch (JSONException e) {
                res = (new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, "Error running and parsing command")).toString();
            }
            out.write(res);
            out.flush();
        } catch (IOException e) {
            throw new SocketServerException("Error processing data to/from socket (" + e.toString() + ")");
        }
    }
    
    private AndroidCommand getCommand(String data) throws JSONException, CommandTypeException {
        return new AndroidCommand(data);
    }
    
    private String runCommand(AndroidCommand cmd) {
        AndroidCommandResult res;
        if (cmd.commandType() == AndroidCommandType.SHUTDOWN) {
            keepListening = false;
            res = new AndroidCommandResult(WDStatus.SUCCESS, "OK, shutting down");
        } else if (cmd.commandType() == AndroidCommandType.ACTION) {
            res = new AndroidCommandExecutor(cmd).execute();
        } else {
            // this code should never be executed, here for future-proofing
            res = new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, "Unknown command type, could not execute!");
        }
        return res.toString();
    }
}
