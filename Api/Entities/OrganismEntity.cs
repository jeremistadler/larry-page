using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Api
{
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
                Id = Id,
                ImagePath = ImagePath,
                Created = Created,
                Width = Width,
                Height = Height
            };
        }
    }
}