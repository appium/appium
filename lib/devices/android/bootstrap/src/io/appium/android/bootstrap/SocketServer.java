package io.appium.android.bootstrap;

import com.android.uiautomator.common.UiWatchers;
import io.appium.android.bootstrap.exceptions.CommandTypeException;
import io.appium.android.bootstrap.exceptions.SocketServerException;
import io.appium.android.bootstrap.handler.UpdateStrings;
import io.appium.android.bootstrap.utils.TheWatchers;
import org.json.JSONException;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Timer;
import java.util.TimerTask;

/**
 * The SocketServer class listens on a specific port for commands from Appium,
 * and then passes them on to the {@link AndroidCommandExecutor} class. It will
 * continue to listen until the command is sent to exit.
 */
class SocketServer {

  ServerSocket   server;
  Socket         client;
  BufferedReader in;
  BufferedWriter out;
  boolean        keepListening;
  private final AndroidCommandExecutor executor;
  private final TheWatchers watchers = TheWatchers.getInstance();
  private final Timer       timer    = new Timer("WatchTimer");

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
      Logger.debug("Socket opened on port " + port);
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

  private StringBuilder input = new StringBuilder();

  /**
   * When data is available on the socket, this method is called to run the
   * command or throw an error if it can't.
   *
   * @throws SocketServerException
   */
  private void handleClientData() throws SocketServerException {
    try {
      input.setLength(0); // clear

      String res;
      int a;
      // (char) -1 is not equal to -1.
      // ready is checked to ensure the read call doesn't block.
      while ((a = in.read()) != -1 && in.ready()) {
        input.append((char) a);
      }
      String inputString = input.toString();
      Logger.debug("Got data from client: " + inputString);
      try {
        AndroidCommand cmd = getCommand(inputString);
        Logger.debug("Got command of type " + cmd.commandType().toString());
        res = runCommand(cmd);
        Logger.debug("Returning result: " + res);
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
    Logger.debug("Appium Socket Server Ready");
    UpdateStrings.loadStringsJson();
    dismissCrashAlerts();
    final TimerTask updateWatchers = new TimerTask() {
      @Override
      public void run() {
        try {
          watchers.check();
        } catch (final Exception e) {
        }
      }
    };
    timer.scheduleAtFixedRate(updateWatchers, 100, 100);

    try {
      client = server.accept();
      Logger.debug("Client connected");
      in = new BufferedReader(new InputStreamReader(client.getInputStream(), "UTF-8"));
      out = new BufferedWriter(new OutputStreamWriter(client.getOutputStream(), "UTF-8"));
      while (keepListening) {
        handleClientData();
      }
      in.close();
      out.close();
      client.close();
      Logger.debug("Closed client connection");
    } catch (final IOException e) {
      throw new SocketServerException("Error when client was trying to connect");
    }
  }

  public void dismissCrashAlerts() {
    try {
      new UiWatchers().registerAnrAndCrashWatchers();
      Logger.debug("Registered crash watchers.");
    } catch (Exception e) {
      Logger.debug("Unable to register crash watchers.");
    }
  }

  /**
   * When {@link #handleClientData()} has valid data, this method delegates the
   * command.
   *
   * @param cmd
   *     AndroidCommand
   * @return Result
   */
  private String runCommand(final AndroidCommand cmd) {
    AndroidCommandResult res;
    if (cmd.commandType() == AndroidCommandType.SHUTDOWN) {
      keepListening = false;
      res = new AndroidCommandResult(WDStatus.SUCCESS, "OK, shutting down");
    } else if (cmd.commandType() == AndroidCommandType.ACTION) {
      try {
        res = executor.execute(cmd);
      } catch (final Exception e) {
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
