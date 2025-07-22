using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_annotation_ratings
    {
        [Key]
        public long rating_id { get; set; }
        public bool is_liked { get; set; }
        public long user_id { get; set; }
        public int question_id { get; set; }
        public int answer_id { get; set; }

    }
}
