using Microsoft.AspNetCore.Mvc;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.Helper
{
    public interface IPDFHelper
    {
        byte[] GetFile(string path);
        string? GetFilePath(int id, SWBDBContext swbDBContext);
    }
    public class PDFHelper: IPDFHelper
    {

        public byte[] GetFile(string path)
        {
            byte[] numArray;
            try
            {
                if (!File.Exists(path))
                {
                    numArray = null;
                }
                else
                {
                    using (FileStream fileStream = File.OpenRead(path))
                    {
                        byte[] numArray1 = new byte[checked((IntPtr)fileStream.Length)];
                        if ((long)fileStream.Read(numArray1, 0, (int)numArray1.Length) != fileStream.Length)
                        {
                            throw new IOException(path);
                        }
                        numArray = numArray1;
                    }
                }
            }
            catch (Exception exception)
            {
                Console.WriteLine(exception);
                numArray = null;
            }
            return numArray;
        }
        public string? GetFilePath(int id, SWBDBContext swbDBContext)
        {
            string? pDFSAVEDPATH=string.Empty;
            try
            {
                var result = swbDBContext.tbl_pdf_uploads.FirstOrDefault(x => x.pdf_uploaded_id == id);
                 if (result != null)
                {
                    pDFSAVEDPATH = result.pdf_saved_path;
                         
                }
    
            }
            catch (Exception exception)
            {
                Console.WriteLine(exception);
                pDFSAVEDPATH = string.Empty;
            }
            return pDFSAVEDPATH;
        }


    }
}
