using ProtoBuf;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Web;

namespace server.Api
{
    public class OrganismView
    {
        public long Id { get; set; }
        [StringLength(255)]
        public string ImagePath { get; set; }
        public DateTime Created { get; set; }
        public int GeneCount { get; set; }

        public OrganismEntity ToEntity()
        {
            return new OrganismEntity
            {
                Id = this.Id,
                ImagePath = this.ImagePath,
                Created = this.Created,
                GeneCount = this.GeneCount
            };
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
        public OrganismView Organism { get; set; }

        public DnaEntity ToEntity()
        {
            return new DnaEntity
            {
                Date = this.Date,
                Fitness = this.Fitness,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneView.Serialize(this.Genes),
            };
        }
    }

    [ProtoContract]
    public class GeneView
    {
        [ProtoMember(1)]
        public double[] Pos { get; set; }
        [ProtoMember(2)]
        public double[] Color { get; set; }

        public static IEnumerable<GeneView> CreateDefault(int geneCount)
        {
            return Enumerable.Range(0, geneCount)
                .Select(f => new GeneView 
                { 
                    Pos = new double[6], 
                    Color = new double[4] 
                });
        }

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

}