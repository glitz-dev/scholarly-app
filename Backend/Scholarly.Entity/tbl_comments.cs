using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Scholarly.Entity
{
    public class tbl_comments
    {
        [Key]
        public long comments_id { get; set; }
        public string comment { get; set; }
        public long user_id { get; set; }
        public int answer_id { get; set; }
        public int question_id { get; set; }
        public string created_by { get; set; }
        public DateTime creation_date { get; set; }
        public bool is_seen { get; set; }
    }
}
