using Microsoft.Owin;
using Owin;
using System.Web.Http;
using System.Web.Http.Cors;
using System.Net.Http.Headers;


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
		}
    }
}
