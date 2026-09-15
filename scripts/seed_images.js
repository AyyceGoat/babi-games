import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import dns from 'dns';

// Force DNS resolution to prefer IPv4 (fixes IPv6 connection timeout hangs on Windows environments)
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENT = 'BabiGamesImageSeeder/4.0 (contact@babigames.ci; pair-programming project)';
const DELAY_MS = 200; // Polite delay between API calls
const REQUEST_TIMEOUT_MS = 4000; // 4 seconds timeout for network resilience

// Outage and throttle bypass states
let wikidataEnabled = true;
let consecutiveWikidataFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

let openverseEnabled = true;
let consecutiveOpenverseFailures = 0;
const MAX_CONSECUTIVE_OPENVERSE_FAILURES = 5;

// Helper sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import https from 'https';

// Create persistent HTTP Keep-Alive agents to avoid SSL/TLS handshake latency on consecutive API calls
const wikidataAgent = new https.Agent({ keepAlive: true });
const commonsAgent = new https.Agent({ keepAlive: true });
const openverseAgent = new https.Agent({ keepAlive: true });
const defaultAgent = new https.Agent({ keepAlive: true });

// Helper fetch wrapper with timeout resilience based on native https (respects IPv4 resolution priority & redirects)
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const redirectDepth = options.redirectDepth || 0;
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    // Select the appropriate persistent socket agent
    let agent = defaultAgent;
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname.includes('wikidata')) {
      agent = wikidataAgent;
    } else if (hostname.includes('commons') || hostname.includes('wikimedia')) {
      agent = commonsAgent;
    } else if (hostname.includes('openverse')) {
      agent = openverseAgent;
    }

    const requestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      agent: agent,
      headers: {
        'User-Agent': USER_AGENT,
        ...(options.headers || {})
      }
    };

    const req = https.request(requestOptions, (res) => {
      // Follow HTTP Redirects recursively up to 5 levels
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        if (redirectDepth < 5) {
          resolve(fetchWithTimeout(redirectUrl, { ...options, redirectDepth: redirectDepth + 1 }, timeoutMs));
          return;
        } else {
          reject(new Error('Too many redirects'));
          return;
        }
      }

      // Safe stream error catcher to prevent process crash
      res.on('error', (err) => {
        console.warn(`  ⚠️ Response stream error: ${err.message}`);
      });

      // Mock response object providing status, ok, json() and arrayBuffer()
      const mockResponse = {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: async () => {
          return new Promise((resolveJSON, rejectJSON) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                resolveJSON(JSON.parse(body));
              } catch (e) {
                rejectJSON(e);
              }
            });
          });
        },
        arrayBuffer: async () => {
          return new Promise((resolveAB, rejectAB) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                // Convert Buffer to ArrayBuffer safely
                const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                resolveAB(arrayBuf);
              } catch (e) {
                rejectAB(e);
              }
            });
          });
        }
      };
      resolve(mockResponse);
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('This operation was aborted'));
    });

    // Write body if present
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = [
    'public/images/artistes',
    'public/images/footballeurs',
    'public/images/publicfigures',
    'public/images/nourriture',
    'public/images/produits',
    'public/images/placeholders',
    'src/data'
  ];
  dirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Clean name search helpers for Wikidata
function getWikidataSearchNames(name) {
  const names = [name];
  
  // Clean parentheticals (e.g. Didier Zokora (Maestro) -> Didier Zokora)
  if (name.includes('(')) {
    const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
    if (cleaned && !names.includes(cleaned)) {
      names.push(cleaned);
    }
  }
  
  // Clean DJ / Group tags (e.g. Kerozen DJ -> Kerozen)
  const djCleaned = name.replace(/\s+DJ$/i, '').replace(/^DJ\s+/i, '').trim();
  if (djCleaned && !names.includes(djCleaned)) {
    names.push(djCleaned);
  }

  // Clean (CI) suffix (e.g. Lamine Camara (CI) -> Lamine Camara)
  const ciCleaned = name.replace(/\s*\(CI\)/i, '').trim();
  if (ciCleaned && !names.includes(ciCleaned)) {
    names.push(ciCleaned);
  }
  
  return names;
}

// Wikidata: search entity checking both label and aliases
async function searchWikidata(name) {
  if (!wikidataEnabled) {
    return null;
  }

  const searchQueries = getWikidataSearchNames(name);
  
  for (const query of searchQueries) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=fr&format=json&origin=*`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const data = await response.json();
      
      // Reset failures on success
      consecutiveWikidataFailures = 0;

      if (data.search && data.search.length > 0) {
        const target = query.toLowerCase();
        
        // Loop through entities to match label or aliases
        const match = data.search.find(result => {
          const label = (result.label || '').toLowerCase();
          if (label === target) return true;
          
          if (result.aliases && Array.isArray(result.aliases)) {
            return result.aliases.some(alias => alias.toLowerCase() === target);
          }
          return false;
        });
        
        if (match) {
          return match.id;
        }
        
        // Fallback to the first entity if no strict match in aliases/label list
        return data.search[0].id;
      }
    } catch (e) {
      console.warn(`  ⚠️ Wikidata search failed or timed out for "${query}":`, e.message);
      
      consecutiveWikidataFailures++;
      if (consecutiveWikidataFailures >= MAX_CONSECUTIVE_FAILURES) {
        wikidataEnabled = false;
        console.warn(`\n🚫 [SYSTEM] Wikidata queries timed out ${MAX_CONSECUTIVE_FAILURES} times consecutively. Disabling Wikidata for the rest of this session.\n`);
        return null;
      }
    }
    await sleep(DELAY_MS);
  }
  return null;
}

// Wikidata: get P18 filename
async function getWikidataImageFilename(entityId) {
  if (!wikidataEnabled) return null;
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&languages=fr&format=json&origin=*`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const data = await response.json();
    
    consecutiveWikidataFailures = 0;

    const entity = data.entities[entityId];
    if (entity && entity.claims && entity.claims.P18) {
      const mainsnak = entity.claims.P18[0].mainsnak;
      if (mainsnak && mainsnak.datavalue && mainsnak.datavalue.value) {
        return mainsnak.datavalue.value;
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Wikidata details fetch failed or timed out for ${entityId}:`, e.message);
    consecutiveWikidataFailures++;
    if (consecutiveWikidataFailures >= MAX_CONSECUTIVE_FAILURES) {
      wikidataEnabled = false;
      console.warn(`\n🚫 [SYSTEM] Wikidata queries timed out ${MAX_CONSECUTIVE_FAILURES} times consecutively. Disabling Wikidata for the rest of this session.\n`);
    }
  }
  return null;
}

// Commons: get direct URL, license and author
async function getCommonsImageInfo(filename) {
  if (!wikidataEnabled) return null;
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const data = await response.json();
    
    consecutiveWikidataFailures = 0;

    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId !== '-1') {
      const imageinfo = pages[pageId].imageinfo[0];
      if (imageinfo) {
        const directUrl = imageinfo.url;
        const metadata = imageinfo.extmetadata || {};
        const license = metadata.LicenseShortName ? metadata.LicenseShortName.value : 'CC-BY-SA';
        const authorHtml = metadata.Artist ? metadata.Artist.value : 'Unknown';
        const author = authorHtml.replace(/<[^>]*>/g, '').trim(); // Strip HTML tags
        return { url: directUrl, license, author };
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Wikimedia Commons fetch failed or timed out for file "${filename}":`, e.message);
    consecutiveWikidataFailures++;
    if (consecutiveWikidataFailures >= MAX_CONSECUTIVE_FAILURES) {
      wikidataEnabled = false;
      console.warn(`\n🚫 [SYSTEM] Wikidata queries timed out ${MAX_CONSECUTIVE_FAILURES} times consecutively. Disabling Wikidata for the rest of this session.\n`);
    }
  }
  return null;
}

// Openverse: search fallback for objects with dimensions filter and source priorities
async function searchOpenverse(query) {
  if (!openverseEnabled) {
    return null;
  }

  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial,modification`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const data = await response.json();
    
    consecutiveOpenverseFailures = 0;

    if (data.results && data.results.length > 0) {
      // Filter out images with dimensions < 300x300
      const validSizeResults = data.results.filter(r => {
        const w = r.width || 0;
        const h = r.height || 0;
        return w >= 300 && h >= 300;
      });

      if (validSizeResults.length === 0) {
        return null;
      }

      // Prioritize Wikimedia Commons or Flickr
      const preferred = validSizeResults.find(r => {
        const source = (r.source || '').toLowerCase();
        const provider = (r.provider || '').toLowerCase();
        return source.includes('wikimedia') || provider.includes('wikimedia') ||
               source.includes('flickr') || provider.includes('flickr');
      });

      const selected = preferred || validSizeResults[0];

      return {
        url: selected.url,
        license: selected.license || 'CC-BY',
        author: selected.creator || 'Unknown'
      };
    }
  } catch (e) {
    console.warn(`  ⚠️ Openverse search failed or timed out for "${query}":`, e.message);
    
    consecutiveOpenverseFailures++;
    if (consecutiveOpenverseFailures >= MAX_CONSECUTIVE_OPENVERSE_FAILURES) {
      openverseEnabled = false;
      console.warn(`\n🚫 [SYSTEM] Openverse queries timed out ${MAX_CONSECUTIVE_OPENVERSE_FAILURES} times consecutively. Disabling Openverse for the rest of this session.\n`);
    }
  }
  return null;
}

// Download, compress with sharp, and save
async function downloadAndOptimize(imageUrl, targetPath) {
  try {
    const response = await fetchWithTimeout(imageUrl, {}, 6000); // 6s timeout for image downloads
    if (!response.ok) return false;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Apply sharp processing: max 400x400, high quality progressive JPEG
    await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(targetPath);

    return true;
  } catch (e) {
    console.warn(`  ⚠️ Image download or sharp optimization failed from ${imageUrl}:`, e.message);
    return false;
  }
}

// Brand product detector helper
const BRANDS_TO_SKIP = ['dinor', 'maggi', 'beaufort', 'peak', 'pénélope', 'penelope', 'sotra', 'kirène', 'kirene', 'tecno'];
function isBrandToSkip(name, query) {
  const lowercaseName = name.toLowerCase();
  const lowercaseQuery = (query || '').toLowerCase();
  return BRANDS_TO_SKIP.some(brand => lowercaseName.includes(brand) || lowercaseQuery.includes(brand));
}

// Main seeder function
async function run() {
  console.log('🏁 Starting Babi Games Image Seeder...');
  ensureDirectories();

  const rawItemsPath = path.join(process.cwd(), 'src/data/rawItems.json');
  if (!fs.existsSync(rawItemsPath)) {
    console.error(`❌ rawItems.json not found in ${rawItemsPath}`);
    process.exit(1);
  }

  const rawItems = JSON.parse(fs.readFileSync(rawItemsPath, 'utf-8'));
  console.log(`📊 Loaded ${rawItems.length} items to process.`);

  // Lists for final db.json structure
  const db = {
    artists: [],
    footballers: [],
    publicFigures: [],
    foods: [],
    products: []
  };

  const categoryMap = {
    artiste: 'artistes',
    footballeur: 'footballeurs',
    public: 'figures_publiques',
    nourriture: 'nourriture',
    produit: 'produits'
  };

  // Structured report
  const outputReport = {
    compteurs: {
      artistes: '',
      footballeurs: '',
      figures_publiques: '',
      nourriture: '',
      produits: ''
    },
    a_verifier_manuellement: {
      artistes: [],
      footballeurs: [],
      figures_publiques: [],
      nourriture: [],
      produits: []
    },
    valides: []
  };

  const totalCounts = {
    artiste: 0,
    footballeur: 0,
    public: 0,
    nourriture: 0,
    produit: 0
  };

  // Calculate totals per category
  rawItems.forEach(item => {
    if (totalCounts[item.type] !== undefined) {
      totalCounts[item.type]++;
    }
  });

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    console.log(`\n🔄 [${i + 1}/${rawItems.length}] Processing ${item.type} "${item.name}"...`);

    let folder = '';
    let placeholder = '';
    if (item.type === 'artiste') {
      folder = 'artistes';
      placeholder = '/images/placeholders/artiste.svg';
    } else if (item.type === 'footballeur') {
      folder = 'footballeurs';
      placeholder = '/images/placeholders/footballeur.svg';
    } else if (item.type === 'public') {
      folder = 'publicfigures';
      placeholder = '/images/placeholders/artiste.svg';
    } else if (item.type === 'nourriture') {
      folder = 'nourriture';
      placeholder = '/images/placeholders/nourriture.svg';
    } else if (item.type === 'produit') {
      folder = 'produits';
      placeholder = '/images/placeholders/produit.svg';
    }

    const relativeImagePath = `/images/${folder}/${item.id}.jpg`;
    const targetPath = path.join(process.cwd(), 'public', 'images', folder, `${item.id}.jpg`);

    let resolvedImage = null;
    let source = 'N/A';
    let license = 'N/A';
    let author = 'N/A';
    let status = 'a_verifier_manuellement';

    const searchQuery = item.search_query || item.name;
    const isBrandProduct = isBrandToSkip(item.name, item.search_query);

    if (isBrandProduct) {
      console.log(`  🚫 Trademarked brand product detected. Skipping API queries.`);
    } else {
      // Step 1: Try Wikidata/Commons Pipeline (first priority for biographical entities)
      if (wikidataEnabled) {
        console.log(`  🔍 Querying Wikidata for "${searchQuery}"...`);
        const qid = await searchWikidata(searchQuery);
        await sleep(DELAY_MS);

        if (qid) {
          console.log(`  Found QID: ${qid}. Fetching P18 image claim...`);
          const filename = await getWikidataImageFilename(qid);
          await sleep(DELAY_MS);

          if (filename) {
            console.log(`  Found P18 image: "${filename}". Fetching Commons info...`);
            const info = await getCommonsImageInfo(filename);
            await sleep(DELAY_MS);

            if (info) {
              resolvedImage = info;
              source = 'wikidata_commons';
              license = info.license;
              author = info.author;
              status = 'ok';
              console.log(`  Resolved via Commons: ${info.url}`);
            }
          }
        }
      }

      // Step 2: Try Openverse fallback for foods & products
      if (!resolvedImage && (item.type === 'nourriture' || item.type === 'produit') && openverseEnabled) {
        console.log(`  🔍 Querying Openverse for "${searchQuery}"...`);
        const info = await searchOpenverse(searchQuery);
        await sleep(DELAY_MS);

        if (info) {
          resolvedImage = info;
          source = 'openverse';
          license = info.license;
          author = info.author;
          status = 'a_verifier_manuellement'; // Requires visual validation
          console.log(`  Resolved via Openverse: ${info.url}`);
        }
      }
    }

    // Step 3: Download & Optimize
    let downloadSuccess = false;
    if (resolvedImage) {
      console.log(`  📥 Downloading and optimizing image from source...`);
      downloadSuccess = await downloadAndOptimize(resolvedImage.url, targetPath);
      await sleep(DELAY_MS);
    }

    // Final outcome allocation
    const finalImage = (resolvedImage && downloadSuccess) ? relativeImagePath : placeholder;
    const finalStatus = (resolvedImage && downloadSuccess) ? status : 'a_verifier_manuellement';

    if (resolvedImage && !downloadSuccess) {
      console.warn(`  ⚠️ Download failed for "${item.name}". Using placeholder instead.`);
    }

    const enrichedItem = {
      id: item.id,
      name: item.name,
      image: finalImage,
      status: finalStatus,
      source: resolvedImage && downloadSuccess ? source : 'N/A',
      license: resolvedImage && downloadSuccess ? license : 'N/A',
      author: resolvedImage && downloadSuccess ? author : 'N/A'
    };

    // Category-specific properties
    if (item.category) enrichedItem.category = item.category;
    if (item.price !== undefined) enrichedItem.price = item.price;

    // Allocate to correct array in database JSON
    if (item.type === 'artiste') {
      db.artists.push(enrichedItem);
    } else if (item.type === 'footballeur') {
      db.footballers.push(enrichedItem);
    } else if (item.type === 'public') {
      db.publicFigures.push(enrichedItem);
    } else if (item.type === 'nourriture') {
      db.foods.push(enrichedItem);
    } else if (item.type === 'produit') {
      db.products.push(enrichedItem);
    }

    // Add to audit report
    const auditEntry = {
      id: item.id,
      name: item.name,
      status: finalStatus,
      source: resolvedImage && downloadSuccess ? source : 'N/A',
      license: resolvedImage && downloadSuccess ? license : 'N/A',
      author: resolvedImage && downloadSuccess ? author : 'N/A',
      image: finalImage
    };

    if (finalStatus === 'ok') {
      outputReport.valides.push(auditEntry);
    } else {
      const groupKey = categoryMap[item.type];
      outputReport.a_verifier_manuellement[groupKey].push(auditEntry);
    }
  }

  // Compile totals and populate counters in audit report
  for (const [type, key] of Object.entries(categoryMap)) {
    const countPending = outputReport.a_verifier_manuellement[key].length;
    const total = totalCounts[type];
    outputReport.compteurs[key] = `${countPending}/${total} à compléter manuellement`;
  }

  // Write outputs
  console.log('\n💾 Writing final files...');
  
  const dbPath = path.join(process.cwd(), 'src/data/db.json');
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`  ✅ Wrote db seed to ${dbPath}`);

  const reportPath = path.join(process.cwd(), 'public/rapport.json');
  fs.writeFileSync(reportPath, JSON.stringify(outputReport, null, 2), 'utf-8');
  console.log(`  ✅ Wrote report to ${reportPath}`);

  console.log('\n🎉 Seeder completed successfully!');
}

run();
