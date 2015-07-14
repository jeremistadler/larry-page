using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;

namespace server.Api
{
    public class DnaController : ApiBase
    {
        [HttpPost, Route("api/upload")]
        public async Task<IHttpActionResult> Upload()
        {
            if (!Request.Content.IsMimeMultipartContent())
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);

            var provider = new MultipartMemoryStreamProvider();
            await Request.Content.ReadAsMultipartAsync(provider);
            var result = new List<string>();

            foreach (var file in provider.Contents)
            {
                var filename = Path.Combine(Environment.CurrentDirectory, "images", Path.GetRandomFileName()) + Path.GetExtension(file.Headers.ContentDisposition.FileName);
                Directory.CreateDirectory(Path.GetDirectoryName(filename));
                using (var fileStream = new FileStream(filename, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None))
                    await file.CopyToAsync(fileStream);
            }

            return Ok();
        }

    }
}
