using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;

namespace server.Api
{
    public class OrganismController : ApiBase
    {
        [HttpPost, Route("api/upload")]
        public async Task<object> Upload()
        {
            if (!Request.Content.IsMimeMultipartContent())
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);

            var provider = new MultipartMemoryStreamProvider();
            await Request.Content.ReadAsMultipartAsync(provider);
            var result = new List<string>();

            foreach (var file in provider.Contents)
            {
                var originalName = file.Headers.ContentDisposition.FileName.Trim('\\', '/', '"');
                var extention = Path.GetExtension(originalName);
                var newFilename = Path.GetRandomFileName();
                var filename = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "images", newFilename) + extention;
                Directory.CreateDirectory(Path.GetDirectoryName(filename));

                using (var fileStream = new FileStream(filename, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None))
                    await file.CopyToAsync(fileStream);

                result.Add(Path.GetFileName(filename));
            }

            return result;
        }

    }
}
