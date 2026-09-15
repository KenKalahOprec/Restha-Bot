import sharp from 'sharp';

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function wrapText(text, maxCharsPerLine = 22) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Max 3 lines
}

export async function generateLaserMeme(imageBuffer, rawText = 'BEDAKAN MODEL SAMA BAGIAN DIK!', element = 'api') {
  const width = 800;
  const height = 800;

  const normalizedElement = element.toLowerCase();
  const isWater = ['air', 'water', 'ice', 'ocean'].includes(normalizedElement);
  const isLightning = ['petir', 'lightning', 'thunder', 'listrik'].includes(normalizedElement);

  // Theme palettes
  let theme = {
    bgBase: '#120202',
    bgGrad1: '#ff4400',
    bgGrad2: '#aa0000',
    schematicColor: 'rgba(255, 60, 20, 0.45)',
    laserCore: '#ffffff',
    laserGlow: '#ff1100',
    laserFlare: '#ff7700',
    textGrad1: '#fffb00',
    textGrad2: '#ff2600',
    textStroke: '#000000',
    particleColor: 'rgba(255, 180, 50, 0.7)'
  };

  if (isWater) {
    theme = {
      bgBase: '#020b17',
      bgGrad1: '#00a6ff',
      bgGrad2: '#003388',
      schematicColor: 'rgba(0, 210, 255, 0.45)',
      laserCore: '#ffffff',
      laserGlow: '#00e5ff',
      laserFlare: '#0077ff',
      textGrad1: '#e0ffff',
      textGrad2: '#0088ff',
      textStroke: '#000000',
      particleColor: 'rgba(100, 220, 255, 0.7)'
    };
  } else if (isLightning) {
    theme = {
      bgBase: '#0c0214',
      bgGrad1: '#bf00ff',
      bgGrad2: '#4b0082',
      schematicColor: 'rgba(230, 100, 255, 0.45)',
      laserCore: '#ffffff',
      laserGlow: '#e100ff',
      laserFlare: '#ffee00',
      textGrad1: '#ffff44',
      textGrad2: '#e100ff',
      textStroke: '#000000',
      particleColor: 'rgba(255, 240, 100, 0.75)'
    };
  }

  // 1. Process user photo: resize and prepare
  const processedUserImg = await sharp(imageBuffer)
    .resize(540, 540, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  // Create subtle circular/vignette mask for user photo
  const maskSvg = `
    <svg width="540" height="540">
      <radialGradient id="vignette">
        <stop offset="65%" stop-color="#fff" stop-opacity="1"/>
        <stop offset="90%" stop-color="#fff" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <rect width="540" height="540" fill="url(#vignette)"/>
    </svg>
  `;

  const maskedUserImg = await sharp(processedUserImg)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. Prepare text lines and layout
  const textLines = wrapText(rawText.toUpperCase(), 20);
  const fontSize = textLines.length > 2 ? 46 : (textLines.length === 2 ? 54 : 64);
  const lineHeight = fontSize * 1.15;
  const startY = height - 70 - (textLines.length - 1) * lineHeight;

  // Build 3D extruded text layers for punchy meme effect
  const depth = 8;
  const textShadowLayers = [];
  for (let d = depth; d >= 1; d--) {
    textLines.forEach((line, idx) => {
      const y = startY + idx * lineHeight + d;
      textShadowLayers.push(
        `<text x="${width / 2 + d}" y="${y}" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="#000000" stroke="#000000" stroke-width="12" stroke-linejoin="round" text-anchor="middle">${escapeXml(line)}</text>`
      );
    });
  }

  const frontTextSvg = textLines.map((line, idx) => {
    const y = startY + idx * lineHeight;
    return `
      <!-- Outline -->
      <text x="${width / 2}" y="${y}" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="#000000" stroke="#000000" stroke-width="14" stroke-linejoin="round" text-anchor="middle">${escapeXml(line)}</text>
      <!-- Gradient Fill -->
      <text x="${width / 2}" y="${y}" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="url(#textGradient)" stroke="url(#textGradient)" stroke-width="2" text-anchor="middle">${escapeXml(line)}</text>
    `;
  }).join('');

  // 3. Laser coordinates from center face outward to bottom-right
  const eye1X = 325;
  const eye1Y = 295;
  const eye2X = 395;
  const eye2Y = 305;

  const target1X = 850;
  const target1Y = 560;
  const target2X = 920;
  const target2Y = 570;

  // 4. Build comprehensive SVG overlay
  const overlaySvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradients -->
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${theme.textGrad1}"/>
          <stop offset="100%" stop-color="${theme.textGrad2}"/>
        </linearGradient>

        <radialGradient id="flameBackdrop" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${theme.bgGrad1}" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="${theme.bgGrad2}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${theme.bgBase}" stop-opacity="0.95"/>
        </radialGradient>

        <!-- Laser Glow Filters -->
        <filter id="laserBeamFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="laserFlareFilter" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Atmospheric Schematic Flowchart Background (SPBE / Tech matrix) -->
      <g stroke="${theme.schematicColor}" stroke-width="2" fill="none" font-family="Courier, monospace" font-size="11" font-weight="bold">
        <!-- Flowchart Boxes -->
        <rect x="70" y="80" width="85" height="36" rx="4"/>
        <text x="112" y="102" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">START</text>

        <rect x="50" y="150" width="130" height="42" rx="4"/>
        <text x="115" y="176" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">PEMANTAUAN</text>

        <polygon points="410,65 475,95 410,125 345,95"/>
        <text x="410" y="99" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">DOKUMEN?</text>

        <rect x="590" y="75" width="105" height="38" rx="4"/>
        <text x="642" y="99" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">NILAI AKHIR</text>

        <rect x="580" y="145" width="125" height="65" rx="4"/>
        <text x="642" y="172" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">AKUNTABEL</text>
        <text x="642" y="192" fill="${theme.schematicColor}" stroke="none" text-anchor="middle">EFEKTIF</text>

        <!-- Connector Lines & Arrows -->
        <line x1="112" y1="116" x2="112" y2="150"/>
        <line x1="180" y1="171" x2="345" y2="95"/>
        <line x1="475" y1="95" x2="590" y2="95"/>
        <line x1="642" y1="113" x2="642" y2="145"/>
      </g>

      <!-- Elemental Particles & Sparks -->
      <g fill="${theme.particleColor}">
        <circle cx="120" cy="220" r="3"/>
        <circle cx="160" cy="110" r="2.5"/>
        <circle cx="680" cy="260" r="4"/>
        <circle cx="730" cy="140" r="2"/>
        <circle cx="280" cy="90"  r="3.5"/>
        <circle cx="530" cy="80"  r="2.5"/>
        <circle cx="90"  cy="340" r="3"/>
        <circle cx="710" cy="380" r="4.5"/>
        <circle cx="630" cy="450" r="3"/>
      </g>

      <!-- Laser Beams (Wide Glow + Concentrated Core) -->
      <g filter="url(#laserBeamFilter)">
        <!-- Outer colored wide laser glow -->
        <line x1="${eye1X}" y1="${eye1Y}" x2="${target1X}" y2="${target1Y}" stroke="${theme.laserGlow}" stroke-width="26" stroke-linecap="round"/>
        <line x1="${eye2X}" y1="${eye2Y}" x2="${target2X}" y2="${target2Y}" stroke="${theme.laserGlow}" stroke-width="26" stroke-linecap="round"/>

        <!-- Middle medium flare -->
        <line x1="${eye1X}" y1="${eye1Y}" x2="${target1X}" y2="${target1Y}" stroke="${theme.laserFlare}" stroke-width="14" stroke-linecap="round"/>
        <line x1="${eye2X}" y1="${eye2Y}" x2="${target2X}" y2="${target2Y}" stroke="${theme.laserFlare}" stroke-width="14" stroke-linecap="round"/>

        <!-- Intense white energy core -->
        <line x1="${eye1X}" y1="${eye1Y}" x2="${target1X}" y2="${target1Y}" stroke="${theme.laserCore}" stroke-width="6" stroke-linecap="round"/>
        <line x1="${eye2X}" y1="${eye2Y}" x2="${target2X}" y2="${target2Y}" stroke="${theme.laserCore}" stroke-width="6" stroke-linecap="round"/>
      </g>

      <!-- Laser Eye Origin Bursts / Lens Flares -->
      <g filter="url(#laserFlareFilter)">
        <circle cx="${eye1X}" cy="${eye1Y}" r="22" fill="${theme.laserGlow}"/>
        <circle cx="${eye1X}" cy="${eye1Y}" r="11" fill="${theme.laserFlare}"/>
        <circle cx="${eye1X}" cy="${eye1Y}" r="5"  fill="${theme.laserCore}"/>

        <circle cx="${eye2X}" cy="${eye2Y}" r="22" fill="${theme.laserGlow}"/>
        <circle cx="${eye2X}" cy="${eye2Y}" r="11" fill="${theme.laserFlare}"/>
        <circle cx="${eye2X}" cy="${eye2Y}" r="5"  fill="${theme.laserCore}"/>
      </g>

      <!-- 3D Extruded Meme Typography (Shadows + Front Fill) -->
      <g>${textShadowLayers.join('')}</g>
      <g>${frontTextSvg}</g>

      <!-- Outer Sticker Die-cut Border -->
      <rect x="14" y="14" width="${width - 28}" height="${height - 28}" rx="32" ry="32" stroke="#ffffff" stroke-width="22" fill="none"/>
    </svg>
  `;

  // 5. Create background canvas and composite all layers together
  const baseBackground = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: theme.bgBase
    }
  })
  .png()
  .toBuffer();

  const finalMemeBuffer = await sharp(baseBackground)
    .composite([
      // Placed user photo slightly below center
      { input: maskedUserImg, top: 150, left: 130 },
      // Full graphic overlay containing flames, schematics, lasers, text, and border
      { input: Buffer.from(overlaySvg), top: 0, left: 0 }
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  return finalMemeBuffer;
}

