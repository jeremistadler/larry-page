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
    
}