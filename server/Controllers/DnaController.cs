using ProtoBuf;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace server.Controllers
{
    public class DnaContext : DbContext
    {
        public DbSet<DnaEntity> Dna { get; set; }

        public DnaContext() : base("mysql")
        {
            Database.SetInitializer<DnaContext>(new CreateDatabaseIfNotExists<DnaContext>());
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
        }
    }

    [ProtoContract]
    public class GeneView
    {
        [ProtoMember(1)]
        public double[] Pos { get; set; }
        [ProtoMember(2)]
        public double[] Color { get; set; }

        public static byte[] Serialize(GeneView[] genes)
        {
            using (var stream = new MemoryStream())
            {
                Serializer.Serialize(stream, genes);
                return stream.ToArray();
            }
        }

        public static GeneView[] Deserialize(byte[] buffer)
        {
            using (var stream = new MemoryStream(buffer))
                return Serializer.DeserializeItems<GeneView>(stream, PrefixStyle.Base128, 1).ToArray();
        }
    }

    public class DnaView
    {
        public long Seed { get; set; }
        public long Generation { get; set; }
        public long Mutation { get; set; }
        public long Fitness { get; set; }
        public DateTime Date { get; set; }
        public GeneView[] Genes { get; set; }

        public DnaEntity ToEntity()
        {
            return new DnaEntity
            {
                Date = this.Date,
                Fitness = this.Fitness,
                GeneCount = this.Genes.Length,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneView.Serialize(this.Genes)
            };
        }
    }

    [Table("Dna")]
    public class DnaEntity
    {
        [Key]
        [Column(Order = 1)]
        public long Seed { get; set; }

        [Key]
        [Column(Order = 2)]
        public long Generation { get; set; }

        public long Mutation { get; set; }
        public long Fitness { get; set; }
        public int GeneCount { get; set; }
        public DateTime Date { get; set; }
        public byte[] Genes { get; set; }

        public DnaView ToView()
        {
            return new DnaView
            {
                Date = this.Date,
                Fitness = this.Fitness,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneView.Deserialize(this.Genes)
            };
        }
    }

    public class DnaController : ApiController
    {
        [HttpPost]
        [Route("api/save")]
        public void Save(DnaView dna)
        {
            using (var db = new DnaContext())
            {
                dna.Date = DateTime.Now;
                db.Dna.Add(dna.ToEntity());
                db.SaveChanges();
            }
        }

        [HttpGet]
        [Route("api/latest")]
        public DnaView GetLatest()
        {
            using (var db = new DnaContext())
                return db.Dna.OrderByDescending(f => f.Date).First().ToView();
        }

        [HttpGet]
        [Route("api/list/latest")]
        public IEnumerable<DnaView> GetLatestList(int limit)
        {
            limit = Math.Min(limit, 200);
            using (var db = new DnaContext())
                return db.Dna.OrderByDescending(f => f.Date).Take(limit).ToArray().Select(f => f.ToView());
        }

        [HttpGet]
        [Route("api/list/fittest")]
        public IEnumerable<DnaView> GetFittestList(int limit)
        {
            limit = Math.Min(limit, 200);
            using (var db = new DnaContext())
                return db.Dna.OrderBy(f => f.Fitness).Take(limit).ToArray().Select(f => f.ToView());
        }

        [HttpGet]
        [Route("api/fittest")]
        public DnaView GetMostFit()
        {
            using (var db = new DnaContext())
                return db.Dna.OrderBy(f => f.Fitness).First().ToView();
        }
    }
}
