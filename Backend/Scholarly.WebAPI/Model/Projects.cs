using System.ComponentModel.DataAnnotations.Schema;

namespace Scholarly.WebAPI.Model
{
    public class Projects
    {
        public int ProjectId { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        [NotMapped]
        public int project_id { get; set; }

        public DateTime CreatedOn { get; set; }

        public DateTime? ModifiedOn { get; set; }

    }
}
