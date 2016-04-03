using ProtoBuf;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Web;

namespace server.Api
{
    public class OrganismModel
    {
        public long Id { get; set; }
        [StringLength(255)]
        public string ImagePath { get; set; }
        public DateTime Created { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }

        public OrganismEntity ToEntity()
        {
            return new OrganismEntity
            {
                Id = this.Id,
                ImagePath = this.ImagePath,
                Created = this.Created,
                Width = this.Width,
                Height = this.Height
            };
        }
    }


    public class DnaModel
    {
        public long Seed { get; set; }
        public long Generation { get; set; }
        public long Mutation { get; set; }
        public long Fitness { get; set; }
        public DateTime Date { get; set; }
        public GeneModel[] Genes { get; set; }
        public OrganismModel Organism { get; set; }

        public DnaEntity ToEntity()
        {
            return new DnaEntity
            {
                Date = this.Date,
                Fitness = this.Fitness,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneModel.Serialize(this.Genes),
            };
        }

        public DnaModel Round()
        {
            foreach (var gene in Genes)
            {
                for (int i = 0; i < gene.Color.Length; i++)
                    gene.Color[i] = Math.Round(gene.Color[i], 2);

                for (int i = 0; i < gene.Pos.Length; i++)
                    gene.Pos[i] = Math.Round(gene.Pos[i], 2);
            }

            return this;
        }
    }

    [ProtoContract]
    public class GeneModel
    {
        [ProtoMember(1)]
        public double[] Pos { get; set; }
        [ProtoMember(2)]
        public double[] Color { get; set; }

        public static IEnumerable<GeneModel> CreateDefault(int geneCount)
        {
            return Enumerable.Range(0, geneCount)
                .Select(f => new GeneModel 
                { 
                    Pos = new double[6], 
                    Color = new double[4] 
                });
        }

        public static byte[] Serialize(GeneModel[] genes)
        {
            using (var stream = new MemoryStream())
            {
                Serializer.Serialize(stream, genes);
                return stream.ToArray();
            }
        }

        public static GeneModel[] Deserialize(byte[] buffer)
        {
            using (var stream = new MemoryStream(buffer))
                return Serializer.DeserializeItems<GeneModel>(stream, PrefixStyle.Base128, 1).ToArray();
        }
    }

}