﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;

namespace server.Api
{
    public class DnaController : ApiBase
    {
		[HttpGet]
		[Route("api/warmup")]
		public object Warmup()
		{
			return "Warmup at " + DateTime.Now.ToShortTimeString();
		}

        [HttpPost]
        [Route("api/dna/save")]
        public object Save(DnaModel dna)
        {
            if (dna == null || dna.Generation <= 0 || dna.Mutation <= 0 || dna.Organism == null || dna.Organism.Id <= 0)
                return BadRequest();

            var organism = Db.Organisms.Find(dna.Organism.Id);
            if (organism == null)
                return BadRequest();

            var bestExisting = Db.Dna.Where(f => f.Organism.Id == dna.Organism.Id).Select(f => f.Fitness).DefaultIfEmpty().Min();
            if (bestExisting != 0 && bestExisting < dna.Fitness)
                return BadRequest("Theres already a dna saved with better fitness");

            organism.LastAccessed = DateTime.Now;

            dna.Date = DateTime.Now;
            var dnaEntity = dna.ToEntity();
            dnaEntity.Organism = organism;
            Db.Dna.Add(dnaEntity);
            Db.SaveChanges();


            return Ok();
        }


        [HttpGet]
        [Route("api/dna/latest")]
        public IEnumerable<DnaModel> GetLatestDna(long organismId, int limit = 1, int skip = 0)
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
        [Route("api/dna/best")]
        public IEnumerable<DnaModel> GetBestDna(long organismId, int limit = 1, int skip = 0)
        {
            limit = Math.Min(limit, 200);
            return Db.Dna
                .Where(f => f.Organism.Id == organismId)
                .OrderByDescending(f => f.Mutation)
                .Take(limit)
                .ToArray()
                .Select(f => f.ToView());
        }

        [HttpGet]
        [Route("api/organismsWithDna")]
        public IEnumerable<DnaModel> GetTopOrganismDnaList(int limit = 10, int skip = 0)
        {
            limit = Math.Min(limit, 100);

            var organisms = Db.Organisms.OrderByDescending(f => f.Created).ToArray();

            return organisms
                .Select(f => Db.Dna.Where(d => d.Organism.Id == f.Id).OrderByDescending(d => d.Mutation).FirstOrDefault())
                .Where(f => f != null)
                .Select(f => f.ToView().Round());
        }

        [HttpGet]
        [Route("api/organisms/latest")]
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
        public DnaModel GetRandomDna()
        {
            var organism = Db.Organisms
                .OrderBy(f => f.LastAccessed)
                .First();

            organism.LastAccessed = DateTime.Now;
            Db.SaveChanges();

            if (Db.Dna.Where(f => f.Organism.Id == organism.Id).Any())
                return Db.Dna
                    .Where(f => f.Organism.Id == organism.Id)
                    .OrderByDescending(f => f.Mutation)
                    .Take(1)
                    .ToArray()
                    .Select(f => f.ToView())
                    .First();

            return new DnaModel
            {
                Date = DateTime.Now,
                Organism = organism.ToView(),
                Fitness = long.MaxValue / 1000,
                Genes = GeneModel.CreateDefault(0).ToArray()
            };
        }
    }
}