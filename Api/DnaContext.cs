using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;

namespace server.Api
{
    public class DnaContext : DbContext
    {
        public DbSet<DnaEntity> Dna { get; set; }
        public DbSet<OrganismEntity> Organisms { get; set; }

		public DnaContext() : base(SecretsReader.Read<string>("db"))
        {
            Database.SetInitializer(new CreateDatabaseIfNotExists<DnaContext>());
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
        }
    }
}