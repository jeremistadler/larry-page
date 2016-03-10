using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using System.IO;
using System.Linq;
using System.Web;

namespace server.Api
{
    public static class SecretsReader
    {
		static JObject json;
		static string[] Paths = new[]
		{
			Path.Combine(Environment.CurrentDirectory, @"App_Data\config.json"),
			Path.Combine(Environment.CurrentDirectory, "config.json"),
			Path.Combine(Environment.CurrentDirectory, @"..\config.json"),
			Path.Combine(Environment.CurrentDirectory, @"..\..\config.json"),
			Path.Combine(Environment.CurrentDirectory, @"..\..\..\config.json"),
			Path.Combine(Environment.CurrentDirectory, @"..\..\..\..\config.json"),
			Path.Combine(Environment.CurrentDirectory, @"..\..\..\..\..\config.json"),
			Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"config.json"),
			Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\config.json"),
		};

		public static T Read<T>(string key)
		{
			if (json == null)
			{
				if (!Paths.Any(File.Exists))
					throw new Exception("Config file not found");
				json = JObject.Parse(File.ReadAllText(Paths.First(File.Exists)));
			}
			var value = json.SelectToken(key).Value<T>();
			return value;
		}
    }
    
}