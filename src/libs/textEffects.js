import sharp from 'sharp';

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

export async function generateTextEffect(style, rawText) {
  const text = escapeXml(rawText.trim().slice(0, 32));
  const width = 850;
  const height = 350;

  let svgContent = '';

  switch (style) {
    case 'text3d': {
      // 3D Extruded Layered Text
      const layers = [];
      const depth = 12;
      for (let i = depth; i >= 1; i--) {
        layers.push(`<text x="${width / 2 + i}" y="${height / 2 + i}" font-family="Arial Black, Impact, sans-serif" font-size="68" font-weight="900" fill="#a81c1c" text-anchor="middle" dominant-baseline="middle">${text}</text>`);
      }
      svgContent = `
        <rect width="100%" height="100%" fill="#1a1a24"/>
        <g>${layers.join('')}</g>
        <text x="${width / 2}" y="${height / 2}" font-family="Arial Black, Impact, sans-serif" font-size="68" font-weight="900" fill="#ff3838" text-anchor="middle" dominant-baseline="middle">${text}</text>
      `;
      break;
    }

    case 'neon': {
      // Cyber Neon Glow
      svgContent = `
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#05050f"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Arial Black, sans-serif" font-size="70" font-weight="900" fill="#00ffff" text-anchor="middle" dominant-baseline="middle" filter="url(#neon-glow)" stroke="#00ffff" stroke-width="2">${text}</text>
      `;
      break;
    }

    case 'glitch': {
      // Cyberpunk Glitch Effect with chromatic aberration
      svgContent = `
        <rect width="100%" height="100%" fill="#0c0d14"/>
        <text x="${width / 2 - 5}" y="${height / 2 - 2}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="bold" fill="#ff0055" opacity="0.85" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <text x="${width / 2 + 5}" y="${height / 2 + 3}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="bold" fill="#00ffff" opacity="0.85" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <text x="${width / 2}" y="${height / 2}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <line x1="100" y1="${height / 2 - 10}" x2="${width - 100}" y2="${height / 2 - 10}" stroke="#0c0d14" stroke-width="4"/>
        <line x1="150" y1="${height / 2 + 15}" x2="${width - 150}" y2="${height / 2 + 15}" stroke="#0c0d14" stroke-width="3"/>
      `;
      break;
    }

    case 'gold': {
      // Metallic Luxury Gold
      svgContent = `
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff5c0"/>
            <stop offset="25%" stop-color="#ffd700"/>
            <stop offset="50%" stop-color="#b8860b"/>
            <stop offset="75%" stop-color="#ffd700"/>
            <stop offset="100%" stop-color="#8b6508"/>
          </linearGradient>
          <filter id="gold-shadow">
            <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#111116"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Georgia, serif" font-size="70" font-weight="900" fill="url(#gold-grad)" text-anchor="middle" dominant-baseline="middle" filter="url(#gold-shadow)" stroke="#4a3500" stroke-width="1">${text}</text>
      `;
      break;
    }

    case 'fire': {
      // Flaming Hot Lava
      svgContent = `
        <defs>
          <linearGradient id="fire-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ff1100"/>
            <stop offset="50%" stop-color="#ff7700"/>
            <stop offset="100%" stop-color="#ffff00"/>
          </linearGradient>
          <filter id="fire-glow">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#140303"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="900" fill="url(#fire-grad)" text-anchor="middle" dominant-baseline="middle" filter="url(#fire-glow)">${text}</text>
      `;
      break;
    }

    case 'graffiti': {
      // Street Urban Graffiti Style
      svgContent = `
        <rect width="100%" height="100%" fill="#1f1f2e"/>
        <text x="${width / 2 + 6}" y="${height / 2 + 6}" font-family="Impact, Arial Black, sans-serif" font-size="80" fill="#000000" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <text x="${width / 2}" y="${height / 2}" font-family="Impact, Arial Black, sans-serif" font-size="80" fill="#00ff66" stroke="#000000" stroke-width="8" text-anchor="middle" dominant-baseline="middle" stroke-linejoin="round">${text}</text>
      `;
      break;
    }

    case 'blood': {
      // Dark Horror / Blood Drip Style
      svgContent = `
        <defs>
          <filter id="blood-blur">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#0a0505"/>
        <text x="${width / 2 + 4}" y="${height / 2 + 4}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="bold" fill="#3b0000" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <text x="${width / 2}" y="${height / 2}" font-family="Impact, Arial Black, sans-serif" font-size="75" font-weight="bold" fill="#b30000" text-anchor="middle" dominant-baseline="middle" filter="url(#blood-blur)">${text}</text>
      `;
      break;
    }

    case 'matrix': {
      // Retro Terminal Green Matrix
      svgContent = `
        <defs>
          <filter id="matrix-glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#000d02"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Courier New, monospace" font-size="65" font-weight="bold" fill="#00ff41" text-anchor="middle" dominant-baseline="middle" filter="url(#matrix-glow)" letter-spacing="4">&gt; ${text} &lt;</text>
      `;
      break;
    }

    case 'ice': {
      // Frozen Ice / Cold Crystal
      svgContent = `
        <defs>
          <linearGradient id="ice-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#99e6ff"/>
            <stop offset="100%" stop-color="#3399ff"/>
          </linearGradient>
          <filter id="ice-shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#80d4ff" flood-opacity="0.9"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#06121f"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Arial Black, Impact, sans-serif" font-size="72" font-weight="900" fill="url(#ice-grad)" text-anchor="middle" dominant-baseline="middle" filter="url(#ice-shadow)" stroke="#ffffff" stroke-width="1">${text}</text>
      `;
      break;
    }

    case 'retro':
    default: {
      // 80s Synthwave Sunset / Vaporwave
      svgContent = `
        <defs>
          <linearGradient id="retro-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff71ce"/>
            <stop offset="50%" stop-color="#01cdfe"/>
            <stop offset="100%" stop-color="#05ffa1"/>
          </linearGradient>
          <filter id="retro-glow">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#180b29"/>
        <text x="${width / 2 + 5}" y="${height / 2 + 5}" font-family="Arial Black, Impact, sans-serif" font-size="75" font-weight="900" fill="#241734" text-anchor="middle" dominant-baseline="middle">${text}</text>
        <text x="${width / 2}" y="${height / 2}" font-family="Arial Black, Impact, sans-serif" font-size="75" font-weight="900" fill="url(#retro-grad)" text-anchor="middle" dominant-baseline="middle" filter="url(#retro-glow)">${text}</text>
      `;
      break;
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

