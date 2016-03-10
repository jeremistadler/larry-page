using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(server.Startup))]

namespace server
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
			var config = GlobalConfiguration;
			config.Formatters.JsonFormatter.SupportedMediaTypes.Add(new MediaTypeHeaderValue("text/html"));
			var cors = new EnableCorsAttribute("*", "*", "*");
			config.EnableCors(cors);
			config.MapHttpAttributeRoutes();
			config.Routes.MapHttpRoute(
				name: "DefaultApi",
				routeTemplate: "api/{controller}/{id}",
				defaults: new { id = RouteParameter.Optional }
			);
        }
    }
}
