using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using System.IO;
using Appium.Samples.Helpers;

namespace Appium.Samples.Helpers
{
	public class LocalServer
	{
		private Thread listenThread;
		private HttpListener httpListener;
		private bool listening;
		private string listenBaseAddress;

		public LocalServer (int port)
		{
			listenBaseAddress = "http://localhost:" + port;
		}
			
		public void Start() {
			httpListener = new HttpListener();
			httpListener.Prefixes.Add(new Uri(listenBaseAddress).ToString());
			httpListener.Start();
			listening = true;

			listenThread = new Thread(Listen);
			listenThread.Start();
			listenThread.IsBackground = true;
		}

		public void Stop() {	
			listening = false;
		}

		private void Process(HttpListenerContext context)
		{
			string filename = context.Request.Url.AbsolutePath;
			filename = filename.Substring(1);
			if (string.IsNullOrEmpty(filename))
				filename = "index.html";
			if(filename == "index.html") {
				filename = Path.Combine(Env.ASSETS_ROOT_DIR, filename);
			} else {
				filename = Path.Combine(Env.APPIUM_ASSETS_ROOT_DIR, filename);
			}

			try {
				Stream input = new FileStream(filename, FileMode.Open);
				byte[] buffer = new byte[1024*16];
				int nbytes;
				while ((nbytes = input.Read(buffer, 0, buffer.Length)) > 0)
					context.Response.OutputStream.Write(buffer, 0, nbytes);
				input.Close();
			
			} catch (System.IO.FileNotFoundException) {
			}
			context.Response.OutputStream.Close();
		}

		private void Listen() {
			while (httpListener.IsListening && listening) {

				HttpListenerContext context;
				try {
					context = httpListener.GetContext();
					string httpMethod = context.Request.HttpMethod;
					string rawUrl = context.Request.RawUrl;
					Console.WriteLine("Processing call to {0} {1}", httpMethod, rawUrl);
					Process (context);
				} catch (HttpListenerException e) {
					Console.Error.WriteLine(e.Message);
					Console.Error.WriteLine(e.StackTrace);
					continue;
				}
			}
		}
	}
}
