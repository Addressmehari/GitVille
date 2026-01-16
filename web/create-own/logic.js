document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('usernameInput');
    const repoInput = document.getElementById('repoInput');
    const userGroup = document.getElementById('userInputGroup');
    const repoGroup = document.getElementById('repoInputGroup');
    const modeBtns = document.querySelectorAll('.mode-btn');
    
    let currentMode = 'user'; // 'user' or 'repo'

    // Mode Switching
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
             modeBtns.forEach(b => b.classList.remove('active'));
             btn.classList.add('active');
             currentMode = btn.dataset.mode;
             
             if(currentMode === 'user') {
                 userGroup.classList.remove('hidden');
                 repoGroup.classList.add('hidden');
             } else {
                 userGroup.classList.add('hidden');
                 repoGroup.classList.remove('hidden');
             }
        });
    });

    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const loader = document.getElementById('loader');
    const successContent = document.getElementById('successContent');
    const errorMsg = document.getElementById('errorMsg');
    
    // Stats Elements
    const statPop = document.getElementById('statPopulation');
    const statTier = document.getElementById('statTier');
    
    // Actions
    const visitLink = document.getElementById('visitLink');
    const downloadBtn = document.getElementById('downloadBtn');

    generateBtn.addEventListener('click', handleGenerate);
    // Enter key
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGenerate(); });
    repoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGenerate(); });

    async function handleGenerate() {
        let target = '';
        
        if (currentMode === 'user') {
            target = input.value.trim();
        } else {
            // Parse Repo Input
            let val = repoInput.value.trim();
            // Handle full URL: https://github.com/owner/repo
            if (val.includes('github.com/')) {
                const parts = val.split('github.com/');
                if (parts[1]) val = parts[1];
            }
            // Remove .git if present
            val = val.replace('.git', '');
            // Remove trailing slashes
            if(val.endsWith('/')) val = val.slice(0, -1);
            
            target = val;
        }

        if (!target) return;

        // Reset UI
        errorMsg.classList.add('hidden');
        resultSection.classList.remove('hidden');
        successContent.classList.add('hidden');
        loader.classList.remove('hidden');
        
        try {
            // 1. Determine API Endpoint
            let apiUrl = '';
            let count = 0;
            let displayTitle = target;
            
            if (currentMode === 'user') {
                 apiUrl = `https://api.github.com/users/${target}`;
            } else {
                 apiUrl = `https://api.github.com/repos/${target}`;
            }
            
            // 2. Fetch Info
            const infoRes = await fetch(apiUrl);
            if (!infoRes.ok) throw new Error(currentMode === 'user' ? 'User not found' : 'Repository not found');
            const info = await infoRes.json();
            
            // 3. Determine Population Source
            // User -> Followers
            // Repo -> Stargazers
            let popUrl = '';
            if (currentMode === 'user') {
                count = info.followers;
                popUrl = `https://api.github.com/users/${target}/followers?per_page=10`;
                displayTitle = info.login;
            } else {
                count = info.stargazers_count;
                popUrl = `https://api.github.com/repos/${target}/stargazers?per_page=10`;
                displayTitle = info.name; // or full_name
            }
            
            const popRes = await fetch(popUrl);
            const citizens = await popRes.json();
            
            const houses = [];
            // Center House (Owner)
            // For Repo, usage owner.login
            const ownerName = currentMode === 'user' ? info.login : info.owner.login;
            houses.push({ x:0, y:0, color: stringToColor(ownerName), username: ownerName });
            
            // Generate distinct positions for up to 10 citizens
            const posOffsets = [
                {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1},
                {x:1,y:1}, {x:-1,y:-1}, {x:1,y:-1}, {x:-1,y:1},
                {x:2,y:0}, {x:-2,y:0}
            ];
            
            citizens.forEach((f, i) => {
                if(i < posOffsets.length) {
                    houses.push({
                         x: posOffsets[i].x,
                         y: posOffsets[i].y,
                         color: stringToColor(f.login),
                         username: f.login
                    });
                }
            });

            // 3. Show Results
            loader.classList.add('hidden');
            successContent.classList.remove('hidden');
            
            // Format Stats
            statPop.innerText = `POP: ${formatCount(count)}`;
            
            let tier = "IRON";
            if (count > 750) tier = "GOLD";
            if (count > 10000) tier = "ELITE";
            statTier.innerText = `TIER: ${tier}`;
            statTier.className = ""; // Reset
            if (tier === 'GOLD') statTier.style.color = '#ffd700';
            if (tier === 'ELITE') statTier.style.color = '#00d4ff';

            // Links
            // Point to Production GitHub Pages
            const finalUrl = `https://addressmehari.github.io/GitVille/web/?u=${target}`;
            visitLink.href = finalUrl;
            
            // Setup Copy Button
            const copyBtn = document.getElementById('copyBtn');
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(finalUrl);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span>✅ Copied!</span>';
                setTimeout(() => copyBtn.innerHTML = originalText, 2000);
            };
            
            // SVG Generation Stored for Click
            // Use displayTitle for card text (e.g. repo name or username)
            downloadBtn.onclick = async () => {
                const svgContent = await SVGGen.generate(displayTitle, count, houses);
                const blob = new Blob([svgContent], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${displayTitle.replace('/','-')}_gitville.svg`;
                a.click();
                URL.revokeObjectURL(url);
            };

        } catch (e) {
            loader.classList.add('hidden');
            errorMsg.innerText = e.message;
            errorMsg.classList.remove('hidden');
        }
    }
});

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

function formatCount(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'k';
    return n;
}
