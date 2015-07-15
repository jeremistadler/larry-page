using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using System.IO;
using System.Linq;
using System.Web;

namespace server.Api
{
    public static class SecretsReader
    {
        static JObject Secrets;
        static SecretsReader()
        {
            var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "secrets.json");
            var text = File.ReadAllText(path);
            Secrets = JObject.Parse(text);
        }

        public static string ReadConnectionString(string key)
        {
            var value = ((Newtonsoft.Json.Linq.JValue)Secrets[key]).Value<string>();
            return value;
        }
    }

    public class DnaContext : DbContext
    {
        public DbSet<DnaEntity> Dna { get; set; }
        public DbSet<OrganismEntity> Organisms { get; set; }

        public DnaContext()
            : base(SecretsReader.ReadConnectionString("db"))
        {
            Database.SetInitializer(new CreateDatabaseIfNotExists<DnaContext>());
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
        }
    }
}