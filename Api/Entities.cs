using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace server.Api
{
    [Table("Dna")]
    public class DnaEntity
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        public long Seed { get; set; }
        public long Generation { get; set; }
        public long Mutation { get; set; }

        //[Index]
        public long Fitness { get; set; }
        //[Index]
        public DateTime Date { get; set; }
        public byte[] Genes { get; set; }

        [Required]
        public virtual OrganismEntity Organism { get; set; }

        public DnaModel ToView()
        {
            return new DnaModel
            {
                Date = this.Date,
                Fitness = this.Fitness,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneModel.Deserialize(this.Genes),
                Organism = this.Organism == null ? null : this.Organism.ToView()
            };
        }
    }

    [Table("Organisms")]
    public class OrganismEntity
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        public string ImagePath { get; set; }
        public DateTime Created { get; set; }
        public DateTime LastAccessed { get; set; }

        public int Width { get; set; }
        public int Height { get; set; }


        public virtual IEnumerable<DnaEntity> Dna { get; set; }

        public OrganismEntity()
        {
            Dna = new HashSet<DnaEntity>();
        }

        public OrganismModel ToView()
        {
            return new OrganismModel
            {
                Id = this.Id,
                ImagePath = this.ImagePath,
                Created = this.Created,
                Width = this.Width,
                Height = this.Height
            };
        }
    }
}