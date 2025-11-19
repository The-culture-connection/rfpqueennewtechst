// Text extractors for different file types
// Note: These will be used server-side only (API routes)

/**
 * Extract text from PDF file
 * Uses pdf2json library for better Next.js compatibility
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const PDFParser = (await import('pdf2json')).default;
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let fullText = '';
          
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((text: any) => {
                  if (text.R) {
                    text.R.forEach((run: any) => {
                      if (run.T) {
                        try {
                          // Try to decode URI-encoded text
                          fullText += decodeURIComponent(run.T) + ' ';
                        } catch (decodeError) {
                          // If decoding fails, use the raw text
                          fullText += run.T + ' ';
                        }
                      }
                    });
                  }
                });
                fullText += '\n'; // New line after each page
              }
            });
          }
          
          if (fullText.trim().length === 0) {
            reject(new Error('No text content found in PDF'));
          } else {
            resolve(fullText.trim());
          }
        } catch (err: any) {
          reject(new Error(`Failed to parse PDF data: ${err.message}`));
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error: any) => {
        reject(new Error(`PDF parsing error: ${error.parserError || error}`));
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(fileBuffer);
    });
  } catch (error: any) {
    console.error('Error extracting PDF text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 * Uses mammoth library
 */
export async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import (only works on server-side)
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from PPTX file
 * Basic extraction - reads slide text
 */
export async function extractTextFromPPTX(fileBuffer: Buffer): Promise<string> {
  try {
    // For PPTX, we'll use a basic approach
    // More sophisticated: use officegen or pptxgenjs
    // For now, convert to string and extract text between XML tags
    
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(fileBuffer);
    
    let allText = '';
    
    // PPTX files have slides in ppt/slides/
    const slideFiles = Object.keys(zip.files).filter(filename => 
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );
    
    for (const slideFile of slideFiles) {
      const slideContent = await zip.file(slideFile)?.async('string');
      if (slideContent) {
        // Extract text between <a:t> tags (text runs in PowerPoint XML)
        const textMatches = slideContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
        if (textMatches) {
          textMatches.forEach(match => {
            const text = match.replace(/<[^>]+>/g, '');
            allText += text + '\n';
          });
        }
      }
    }
    
    return allText.trim();
  } catch (error) {
    console.error('Error extracting PPTX text:', error);
    throw new Error('Failed to extract text from PPTX');
  }
}

/**
 * Extract text from image using OCR
 * Uses tesseract.js
 * Note: This is computationally expensive!
 */
export async function extractTextFromImage(fileBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import
    const Tesseract = await import('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
    return text;
  } catch (error) {
    console.error('Error extracting image text:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Main entry point - determine file type and extract text
 */
export async function extractTextFromFile(
  fileBuffer: Buffer, 
  fileType: string
): Promise<string> {
  console.log(`📄 Extracting text from file type: ${fileType}`);
  
  // Determine extractor based on MIME type
  if (fileType === 'application/pdf' || fileType.includes('pdf')) {
    return await extractTextFromPDF(fileBuffer);
  } 
  else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    fileType.includes('word')
  ) {
    return await extractTextFromDOCX(fileBuffer);
  } 
  else if (
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileType.includes('presentation')
  ) {
    return await extractTextFromPPTX(fileBuffer);
  } 
  else if (fileType.startsWith('image/')) {
    return await extractTextFromImage(fileBuffer);
  } 
  else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

