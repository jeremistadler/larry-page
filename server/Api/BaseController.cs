using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace server.Api
{
    public abstract class ApiBase : ApiController
    {
        public DnaContext Db { get; set; }

        public ApiBase()
        {
            Db = new DnaContext();
        }

        protected override void Dispose(bool disposing)
        {
            Db.Dispose();
            base.Dispose(disposing);
        }
    }
}