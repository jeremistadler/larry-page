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

        public OrganismEntity ToEntity()
        {
            return new OrganismEntity
            {
                Id = this.Id,
                ImagePath = this.ImagePath,
                Created = this.Created
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
        public OrganismView Species { get; set; }

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
                Organism = (this.Species ?? new OrganismView()).ToEntity()
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