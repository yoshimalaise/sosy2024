import fs from 'fs';
import path from 'path';
import { pdfToPng } from 'pdf-to-png-converter';
import { JSDOM } from 'jsdom';
import { getHighlighter } from 'shiki';

const srcDir = '../src/images';
const outputDir = '../output/images';

const paperHtmlPath = '../output/paper.html';
let paperHtml = fs.readFileSync(paperHtmlPath, 'utf-8');

const pdfFiles = fs.readdirSync(srcDir).filter(file => path.extname(file) === '.pdf');

async function process() {
    await Promise.all(pdfFiles.map(async pdfFile => {
        const pdfPath = path.join(srcDir, pdfFile);
        const pages = await pdfToPng(pdfPath, {
            disableFontFace: true,
            useSystemFonts: true,
            enableXfa: false,
            viewportScale: 10.0,
            outputFolder: outputDir,
            strictPagesToProcess: false,
            verbosityLevel: 0,
        });
        const pngFileName = path.basename(pdfFile, '.pdf') + '.png';
        fs.cpSync(path.join(outputDir, pages[0].name), path.join(outputDir, pngFileName));
        fs.rmSync(path.join(outputDir, pages[0].name));

        // Replace <embed src=...> with <img src=...> in paper.html
        paperHtml = paperHtml.replace(`<embed src="images/${path.basename(pdfFile)}" />`, `<img src="images/${pngFileName}">`);
    }));
    
    // Get all listings from the paper
    const dom = new JSDOM(paperHtml);
    const preElements = dom.window.document.querySelectorAll('pre');
    
    const turtleLang = JSON.parse(fs.readFileSync('./data/turtle.tmLanguage.json', 'utf8'))
    const highlighter = await getHighlighter({
        themes: ['nord'],
        langs: [turtleLang]
    });
    preElements.forEach(pre => {
        const code = pre.textContent;
        const highlightedCode = highlighter.codeToHtml(code, {
            lang: 'Turtle',
            theme: 'nord',
        });
        pre.outerHTML = highlightedCode;
    });
    paperHtml = dom.serialize();
    
    // Save file
    console.log('Saving paper.html');
    fs.writeFileSync(paperHtmlPath, paperHtml);
}

process();
