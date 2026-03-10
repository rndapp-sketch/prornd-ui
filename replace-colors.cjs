const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const colorMap = {
    // Backgrounds
    'bg-\\[#FAFAF9\\]': 'bg-claude-bg',
    'dark:bg-\\[#18181B\\]': 'dark:bg-claude-bg-dark',
    'bg-\\[#FFFFFF\\]': 'bg-white',
    'dark:bg-\\[#27272A\\]': 'dark:bg-claude-card-dark',
    'bg-\\[#F0F4F8\\]': 'bg-claude-bg', // Legacy light blue replacing with warm white
    'bg-\\[#FDF3F0\\]': 'bg-zinc-50 dark:bg-zinc-800',
    'bg-\\[#E0F7F6\\]': 'bg-zinc-50 dark:bg-zinc-800',

    // Accents & Borders
    'border-\\[#E4E4E7\\]': 'border-claude-border',
    'dark:border-\\[#3F3F46\\]': 'dark:border-claude-border-dark',
    'text-\\[#9A7D5A\\]': 'text-claude-accent',
    'dark:text-\\[#D4D4D8\\]': 'dark:text-claude-accent-dark',

    // Text
    'text-\\[#3F3F46\\]': 'text-claude-text-primary',
    'dark:text-\\[#E4E4E7\\]': 'dark:text-claude-text-primary-dark',
    'text-\\[#71717A\\]': 'text-claude-text-secondary',
    'dark:text-\\[#A1A1AA\\]': 'dark:text-claude-text-secondary-dark',

    // Primary Terracotta Actions
    'bg-\\[#D97757\\]': 'bg-claude-terracotta',
    'text-\\[#D97757\\]': 'text-claude-terracotta',
    'border-\\[#D97757\\]': 'border-claude-terracotta',
    'hover:bg-\\[#C66A4E\\]': 'hover:bg-claude-terracotta-hover',
    'focus:border-\\[#D97757\\]': 'focus:border-claude-terracotta',
    'focus:ring-\\[#D97757\\]/25': 'focus:ring-claude-terracotta/25',
    'focus:ring-\\[#D97757\\]/20': 'focus:ring-claude-terracotta/20',

    // Legacy Teals (Replace with Terracotta or Zinc)
    'text-\\[#0EA5A4\\]': 'text-claude-terracotta',
    'bg-\\[#0EA5A4\\]': 'bg-claude-terracotta',
    'border-\\[#0EA5A4\\]': 'border-claude-terracotta',
    'hover:bg-\\[#0C8F8E\\]': 'hover:bg-claude-terracotta-hover',
    'hover:border-\\[#0EA5A4\\]': 'hover:border-claude-terracotta',
    'hover:text-\\[#0EA5A4\\]': 'hover:text-claude-terracotta',
    'border-\\[#0D9494\\]': 'border-claude-terracotta-hover',
    'focus:border-\\[#0EA5A4\\]': 'focus:border-claude-terracotta',
    'focus:ring-\\[rgba\\(14,165,164,0\\.25\\)\\]': 'focus:ring-claude-terracotta/25',

    // Specific violations fixes mapped out during run
    'bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:border-claude-terracotta hover:text-claude-terracotta hover:bg-zinc-50 dark:bg-zinc-800/50': 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800', // standardising secondary button
    'shadow-md hover:shadow-lg border-2 border-[#C66A4E]': 'shadow-sm hover:opacity-90 font-medium transition-all',
    'shadow-md hover:shadow-lg border border-[#C66A4E]': 'shadow-sm hover:opacity-90 font-medium transition-all',
};

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    for (const [key, value] of Object.entries(colorMap)) {
        const regex = new RegExp(key, 'g');
        content = content.replace(regex, value);
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath.replace(srcDir, 'src')}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

console.log('Starting color replacement audit...');
walkDir(srcDir);
console.log('Finished processing src/ directory.');
