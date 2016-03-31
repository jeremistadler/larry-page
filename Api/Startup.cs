using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Owin;
using Owin;
using System.Web.Http;
using System.Web.Http.Cors;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Text;
using System.IO;
using System.Globalization;

[assembly: OwinStartup(typeof(server.Startup))]
namespace server
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
			var config = new HttpConfiguration();
			config.Formatters.JsonFormatter.SupportedMediaTypes.Add(new MediaTypeHeaderValue("text/html"));
			var cors = new EnableCorsAttribute("*", "*", "*");
			config.EnableCors(cors);
			config.MapHttpAttributeRoutes();
			config.Routes.MapHttpRoute(
				name: "DefaultApi",
				routeTemplate: "api/{controller}/{id}",
				defaults: new { id = RouteParameter.Optional }
			);

			app.UseWebApi (config);

			app.Use((ctx,next) => Invoke(ctx,next));
		}

		// Invoked once per request.
		public Task Invoke(IOwinContext ctx, Func<Task> next)
		{
			string responseText = "Hello World";
			byte[] responseBytes = Encoding.UTF8.GetBytes(responseText);

			// See http://owin.org/spec/owin-1.0.0.html for standard environment keys.
			Stream responseStream = (Stream)ctx.Environment["owin.ResponseBody"];
			IDictionary<string, string[]> responseHeaders =
				(IDictionary<string, string[]>)ctx.Environment["owin.ResponseHeaders"];

			responseHeaders["Content-Length"] = new string[] { responseBytes.Length.ToString(CultureInfo.InvariantCulture) };
			responseHeaders["Content-Type"] = new string[] { "text/plain" };

			return Task.Factory.FromAsync(responseStream.BeginWrite, responseStream.EndWrite, responseBytes, 0, responseBytes.Length, null);
			// 4.5: return responseStream.WriteAsync(responseBytes, 0, responseBytes.Length);
		}
    }
}
