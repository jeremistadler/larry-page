using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
                Date = Date,
                Fitness = Fitness,
                Generation = Generation,
                Mutation = Mutation,
                Seed = Seed,
                Genes = GeneModel.Deserialize(Genes),
                Organism = Organism == null ? null : Organism.ToView()
            };
        }
    }
    
}