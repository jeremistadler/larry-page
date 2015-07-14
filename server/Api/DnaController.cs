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
            if (dna == null || dna.Generation <= 0 || dna.Mutation <= 0 || dna.Organism == null || dna.Organism.Id <= 0)
                return BadRequest();

            dna.Date = DateTime.Now;
            Db.Dna.Add(dna.ToEntity());
            Db.SaveChanges();

            return Ok();
        }

        [HttpGet]
        [Route("api/dna/latest")]
        public IEnumerable<DnaView> GetLatestDna(long organismId, int limit = 1, int skip = 0)
        {
            limit = Math.Min(limit, 200);
            return Db.Dna
                .Where(f => f.Organism.Id == organismId)
                .OrderByDescending(f => f.Date)
                .Take(limit)
                .ToArray()
                .Select(f => f.ToView());
        }

        [HttpGet]
        [Route("api/organisms/top")]
        public IEnumerable<DnaView> GetTopOrganismDnaList(int limit = 10, int skip = 0)
        {
            limit = Math.Min(limit, 200);

            return Db.Organisms
                .Where(f => f.Dna.Any())
                .OrderByDescending(f => f.Created)
                .Skip(skip)
                .Take(limit)
                .Select(f => f.Dna.OrderByDescending(a => a.Date).First())
                .ToArray()
                .Select(f => f.ToView());
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
            var organism = Db.Organisms
                .OrderByDescending(f => f.Created)
                .First();

            if (organism.Dna.Any())
                return organism.Dna
                    .OrderByDescending(f => f.Date)
                    .Take(1)
                    .ToArray()
                    .Select(f => f.ToView())
                    .First();

            return new DnaView
            {
                Date = DateTime.Now,
                Organism = organism.ToView(),
                Genes = GeneView.CreateDefault(organism.GeneCount).ToArray()
            };
        }
    }
}
