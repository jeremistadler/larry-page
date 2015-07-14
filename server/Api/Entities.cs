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
        public long Fitness { get; set; }
        public DateTime Date { get; set; }
        public byte[] Genes { get; set; }

        [Required]
        public OrganismEntity Organism { get; set; }

        public DnaView ToView()
        {
            return new DnaView
            {
                Date = this.Date,
                Fitness = this.Fitness,
                Generation = this.Generation,
                Mutation = this.Mutation,
                Seed = this.Seed,
                Genes = GeneView.Deserialize(this.Genes),
                Organism = this.Organism.ToView()
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
        public int GeneCount { get; set; }

        public virtual IEnumerable<DnaEntity> Dna { get; set; }

        public OrganismEntity()
        {
            Dna = new HashSet<DnaEntity>();
        }

        public OrganismView ToView()
        {
            return new OrganismView
            {
                Id = this.Id,
                ImagePath = this.ImagePath,
                Created = this.Created,
                GeneCount = this.GeneCount
            };
        }
    }
}