using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;

namespace server.Api
{
    class UploadedImage
    {
        public string OriginalFilename { get; }
        public string NewFilename { get; }
        public string Extention => Path.GetExtension(OriginalFilename);
        public Image Image { get; }
        public MemoryStream Stream { get; }

        public UploadedImage(string originalFilename, Image image, MemoryStream stream)
        {
            OriginalFilename = originalFilename;
            NewFilename = "src-" + Guid.NewGuid().ToString().Replace("-", "") + Extention;
            Image = image;
            Stream = stream;
        }
    }

    class UploadedFile
    {
        public string OriginalFilename { get; }
        public string Extention => Path.GetExtension(OriginalFilename);
        public MemoryStream Stream { get; }

        public UploadedFile(string originalFilename, MemoryStream stream)
        {
            OriginalFilename = originalFilename;
            Stream = stream;
        }
    }

    class UploadResult<T>
    {
        public UploadResult(T value) { Value = value; }
        public UploadResult(object error) { Error = error; }

        public T Value { get; }
        public object Error { get; }
        public bool HasErrors => Error != null && Value == null;
    }


    public class OrganismController : ApiBase
    {
        UploadResult<T> CreateError<T>(HttpStatusCode statusCode) => new UploadResult<T>(StatusCode(statusCode));
        UploadResult<T> CreateBadRequest<T>(string message) => new UploadResult<T>(BadRequest(message));

        static readonly Dictionary<string, ImageFormat> _imageFormats = new Dictionary<string, ImageFormat>
        {
            {".bmp", ImageFormat.Bmp},
            {".gif", ImageFormat.Gif},
            {".jpe", ImageFormat.Jpeg},
            {".jpeg", ImageFormat.Jpeg},
            {".jpg", ImageFormat.Jpeg},
            {".png", ImageFormat.Png},
        };

        async Task<UploadResult<UploadedFile>> FileFromRequest()
        {
            if (!Request.Content.IsMimeMultipartContent())
                return CreateError<UploadedFile>(HttpStatusCode.UnsupportedMediaType);

            var provider = new MultipartMemoryStreamProvider();
            provider = await Request.Content.ReadAsMultipartAsync(provider);

            var file = provider.Contents.First();
            var originalFilename = file.Headers.ContentDisposition.FileName.Trim('\"');

            var buffer = await file.ReadAsByteArrayAsync();
            var stream = new MemoryStream(buffer);

            return new UploadResult<UploadedFile>(new UploadedFile(originalFilename, stream));
        }

        static bool FixOrientation(Image image)
        {
            // 0x0112 is the EXIF byte address for the orientation tag
            if (!image.PropertyIdList.Contains(0x0112))
            {
                return false;
            }

            // get the first byte from the orientation tag and convert it to an integer
            var orientationNumber = image.GetPropertyItem(0x0112).Value[0];

            switch (orientationNumber)
            {
                // up is pointing to the right
                case 8:
                    image.RotateFlip(RotateFlipType.Rotate270FlipNone);
                    return true;

                // up is pointing to the bottom (image is upside-down)
                case 3:
                    image.RotateFlip(RotateFlipType.Rotate180FlipNone);
                    return true;

                // up is pointing to the left
                case 6:
                    image.RotateFlip(RotateFlipType.Rotate90FlipNone);
                    return true;

                // up is pointing up (correct orientation)
                case 1:
                    return false;
            }

            return false;
        }

        UploadResult<UploadedImage> ToImage(UploadedFile file)
        {
            if (!_imageFormats.ContainsKey(file.Extention))
                return CreateBadRequest<UploadedImage>("Not an image file");

            file.Stream.Position = 0;
            var image = Image.FromStream(file.Stream);
            if (FixOrientation(image))
            {
                var encoders = ImageCodecInfo.GetImageEncoders();
                var imageCodecInfo = encoders.FirstOrDefault(f => f.FilenameExtension.IndexOf(file.Extention, StringComparison.OrdinalIgnoreCase) >= 0);
                if (imageCodecInfo != null)
                {
                    using (var parameters = new EncoderParameters(1))
                    {
                        parameters.Param[0] = new EncoderParameter(Encoder.Quality, 90L);
                        var newStream = new MemoryStream();
                        image.Save(newStream, imageCodecInfo, parameters);
                        return new UploadResult<UploadedImage>(new UploadedImage(file.OriginalFilename, image, newStream));
                    }
                }
            }

            return new UploadResult<UploadedImage>(new UploadedImage(file.OriginalFilename, image, file.Stream));
        }

        void SaveToStorage(UploadedImage image)
        {
            var filename = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "images", image.NewFilename);
            Directory.CreateDirectory(Path.GetDirectoryName(filename));

            image.Stream.Position = 0;
            using (var fileStream = new FileStream(filename, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None))
                image.Stream.WriteTo(fileStream);
        }

        OrganismEntity CreateAndSaveOrganism(UploadedImage image)
        {
            var entity = new OrganismEntity
            {
                Created = DateTime.Now,
                LastAccessed = DateTime.Now.AddDays(-100),
                Width = image.Image.Width,
                Height = image.Image.Height,
                ImagePath = image.NewFilename
            };
            Db.Organisms.Add(entity);
            Db.SaveChanges();
            return entity;
        }

        [HttpPost, Route("api/upload")]
        public async Task<object> Upload()
        {
            var result = await FileFromRequest();
            if (result.HasErrors)
                return result.Error;

            var imageResult = ToImage(result.Value);
            if (imageResult.HasErrors)
                return imageResult.Error;

            var image = imageResult.Value;
            SaveToStorage(image);
            var entity = CreateAndSaveOrganism(image);

            image.Image.Dispose();
            return new
            {
                entity.Id,
                entity.ImagePath,
                entity.Width,
                entity.Height,
            };
        }
    }
}
