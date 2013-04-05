package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.exceptions.CommandTypeException;
import io.appium.android.bootstrap.exceptions.SocketServerException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;

import org.json.JSONException;

/**
 * The SocketServer class listens on a specific port for commands from Appium,
 * and then passes them on to the {@link AndroidCommandExecutor} class. It will
 * continue to listen until the command is sent to exit.
 */
class SocketServer {

  ServerSocket                         server;
  Socket                               client;
  BufferedReader                       in;
  PrintWriter                          out;
  boolean                              keepListening;
  private final AndroidCommandExecutor executor;

  /**
   * Constructor
   * 
   * @param port
   * @throws SocketServerException
   */
  public SocketServer(final int port) throws SocketServerException {
    keepListening = true;
    executor = new AndroidCommandExecutor();
    try {
      server = new ServerSocket(port);
      Logger.info("Socket opened on port " + port);
    } catch (final IOException e) {
      throw new SocketServerException(
          "Could not start socket server listening on " + port);
    }
  }

  /**
   * Constructs an @{link AndroidCommand} and returns it.
   * 
   * @param data
   * @return @{link AndroidCommand}
   * @throws JSONException
   * @throws CommandTypeException
   */
  private AndroidCommand getCommand(final String data) throws JSONException,
      CommandTypeException {
    return new AndroidCommand(data);
  }

  /**
   * When data is available on the socket, this method is called to run the
   * command or throw an error if it can't.
   * 
   * @throws SocketServerException
   */
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
      } catch (final CommandTypeException e) {
        res = new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage())
            .toString();
      } catch (final JSONException e) {
        res = new AndroidCommandResult(WDStatus.UNKNOWN_ERROR,
            "Error running and parsing command").toString();
      }
      out.write(res);
      out.flush();
    } catch (final IOException e) {
      throw new SocketServerException("Error processing data to/from socket ("
          + e.toString() + ")");
    }
  }

  /**
   * Listens on the socket for data, and calls {@link #handleClientData()} when
   * it's available.
   * 
   * @throws SocketServerException
   */
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
    } catch (final IOException e) {
      throw new SocketServerException("Error when client was trying to connect");
    }
  }

  /**
   * When {@link #handleClientData()} has valid data, this method delegates the
   * command.
   * 
   * @param cmd
   * @return
   */
  private String runCommand(final AndroidCommand cmd) {
    AndroidCommandResult res;
    if (cmd.commandType() == AndroidCommandType.SHUTDOWN) {
      keepListening = false;
      res = new AndroidCommandResult(WDStatus.SUCCESS, "OK, shutting down");
    } else if (cmd.commandType() == AndroidCommandType.ACTION) {
      try {
        res = executor.execute(cmd);
      } catch (final AndroidCommandException e) {
        res = new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      }
    } else {
      // this code should never be executed, here for future-proofing
      res = new AndroidCommandResult(WDStatus.UNKNOWN_ERROR,
          "Unknown command type, could not execute!");
    }
    return res.toString();
  }
}
