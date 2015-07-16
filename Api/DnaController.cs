using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;

namespace server.Api
{
    public class DnaController : ApiBase
    {
        [HttpPost]
        [Route("api/dna/save")]
        public object Save(DnaView dna)
        {
            if (dna == null || dna.Generation <= 0 || dna.Mutation <= 0 || dna.Organism == null || dna.Organism.Id <= 0)
                return BadRequest();

            var organism = Db.Organisms.Find(dna.Organism.Id);
            if (organism == null)
                return BadRequest();

            dna.Date = DateTime.Now;
            var dnaEntity = dna.ToEntity();
            dnaEntity.Organism = organism;
            Db.Dna.Add(dnaEntity);
            Db.SaveChanges();

            return Ok();
        }

        [HttpPost]
        [Route("api/organism/save")]
        public object Save(OrganismView organism)
        {
            if (organism == null || organism.GeneCount <= 0 || string.IsNullOrWhiteSpace(organism.ImagePath))
                return BadRequest();

            organism.Created = DateTime.Now;
            organism.Id = 0;
            Db.Organisms.Add(organism.ToEntity());
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

            return Db.Dna
                .OrderBy(f => f.Fitness)
                .GroupBy(f => f.Organism)
                .Select(f => f.FirstOrDefault())
                .OrderBy(f => f.Fitness)
                .Skip(skip)
                .Take(limit)
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

            if (Db.Dna.Where(f => f.Organism.Id == organism.Id).Any())
                return Db.Dna
                    .Where(f => f.Organism.Id == organism.Id)
                    .OrderBy(f => f.Fitness)
                    .Take(1)
                    .ToArray()
                    .Select(f => f.ToView())
                    .First();

            return new DnaView
            {
                Date = DateTime.Now,
                Organism = organism.ToView(),
                Fitness = long.MaxValue / 1000,
                Genes = GeneView.CreateDefault(organism.GeneCount).ToArray()
            };
        }
    }
}
