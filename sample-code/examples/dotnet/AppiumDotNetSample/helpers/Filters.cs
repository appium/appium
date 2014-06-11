using System;
using System.Collections.Generic;
using OpenQA.Selenium;
using System.Collections;

namespace Appium.Samples.Helpers
{
	public class Filters
	{
		public static IWebElement FirstWithName(IList<IWebElement> els, string name)
		{
			for (int i = 0; i < els.Count; i++) 
			{
				if (els [i].GetAttribute ("name") == name) {
					return els[i];
				}
			}
			return null;
		}

		public static IList<IWebElement> FilterWithName(IList<IWebElement> els, string name)
		{
			var res = new List<IWebElement> ();
			for (int i = 0; i < els.Count; i++) 
			{
				if (els [i].GetAttribute ("name") == name) {
					res.Add(els [i]);
				}
			}
			return res;
		}

		public static IList<IWebElement> FilterDisplayed(IList<IWebElement> els)
		{
			var res = new List<IWebElement> ();
			for (int i = 0; i < els.Count; i++) 
			{
				IWebElement el = els [i];
				if (els [i].Displayed ) {
					res.Add(els [i]);
				}
			}
			return res;
		}

	}
}
