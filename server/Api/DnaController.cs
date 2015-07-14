using System;
using System.Collections.Generic;
using System.Linq;
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

    public class DnaController : ApiBase
    {
        [HttpPost]
        [Route("api/dna/save")]
        public object Save(DnaView dna)
        {
            if (dna == null || dna.Generation <= 0 || dna.Mutation <= 0 || dna.Species == null || dna.Species.Id <= 0)
                return BadRequest();

            dna.Date = DateTime.Now;
            Db.Dna.Add(dna.ToEntity());
            Db.SaveChanges();

            return Ok();
        }

        [HttpGet]
        [Route("api/organisms/lastest")]
        public IEnumerable<object> GetLatestOrganisms(int limit = 10, int skip = 0)
        {
            limit = Math.Min(limit, 200);

            return Db.Organisms
                .OrderByDescending(f => f.Created)
                .Skip(skip)
                .Take(limit)
                .Select(f => new
                {
                    f.Id,
                    f.ImagePath,
                    f.Created
                });
        }

        [HttpGet]
        [Route("api/dna/random")]
        public DnaView GetRandomDna()
        {
            return Db.Organisms
                .OrderByDescending(f => f.Created)
                .First().Dna
                .OrderByDescending(f => f.Date)
                .Take(1)
                .ToArray()
                .Select(f => f.ToView())
                .First();
        }

        [HttpGet]
        [Route("api/dna/latest")]
        public IEnumerable<DnaView> GetLatestDna(int limit = 1, int skip = 0)
        {
            limit = Math.Min(limit, 200);
            return Db.Dna.OrderByDescending(f => f.Date).Take(limit).ToArray().Select(f => f.ToView());
        }
    }
}
