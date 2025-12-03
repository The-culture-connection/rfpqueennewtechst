const { KeywordExtractor } = require('./lib/keywordExtractor');
const fs = require('fs');

async function main() {
  try {
    console.log('Starting keyword extraction...');
    
    const extractor = new KeywordExtractor();
    const csvPath = './descriptions-export-2025-10-11.csv';
    
    console.log('Analyzing CSV file...');
    const results = await extractor.extractKeywords(csvPath);
    
    console.log('Generating report...');
    const report = extractor.generateKeywordReport(results);
    
    // Save detailed results to JSON
    const jsonOutput = {
      summary: results.summary,
      topKeywords: results.allKeywords.slice(0, 100),
      categoryKeywords: results.categoryKeywords,
      categories: extractor.categories
    };
    
    fs.writeFileSync('keyword-analysis.json', JSON.stringify(jsonOutput, null, 2));
    fs.writeFileSync('keyword-analysis-report.md', report);
    
    console.log('\n=== KEYWORD EXTRACTION COMPLETE ===');
    console.log(`Total Documents: ${results.summary.totalDocuments}`);
    console.log(`Total Keywords: ${results.summary.totalKeywords}`);
    console.log(`Top 10 Keywords: ${results.summary.topKeywords.slice(0, 10).map(k => k.keyword).join(', ')}`);
    
    console.log('\nCategory Breakdown:');
    for (const [category, count] of Object.entries(results.summary.categoryBreakdown)) {
      console.log(`- ${category}: ${count} occurrences`);
    }
    
    console.log('\nFiles generated:');
    console.log('- keyword-analysis.json (detailed data)');
    console.log('- keyword-analysis-report.md (human-readable report)');
    
  } catch (error) {
    console.error('Error during keyword extraction:', error);
  }
}

main();

