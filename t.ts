import axios from "axios";
import { load } from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://www.merterelektronik.com";
const SEARCH_PATH = "/Arama?1&kelime=adaptor";

const OUTPUT_DIR = "scraped";
const OUTPUT_FILE = `${OUTPUT_DIR}/merter2-adaptor-products.json`;

const truncate = (input: string, len = 500) =>
  input.length > len ? `${input.slice(0, len)}…` : input;

const absolute = (href?: string | null) => {
  if (!href) return null;
  return href.startsWith("http") ? href : `${BASE}${href}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  // From provided list (rotated to look like diverse clients)
  "Acast/Android",
  "Acast iOS",
  "AhrefsBot/7.0 (+http://ahrefs.com/robot/)",
  "Audible,Android",
  "Audible,Darwin",
  "AmazonMusic/9.16.1 iPhone9,1 CFNetwork/1128.0.1 Darwin/19.6.0",
  "AmazonMusic/16.17.0 Dalvik/2.1.0 (Linux; U; Android 6.0.1; vivo 1610 Build/MMB29M)",
  "AmazonMusic/22.13.3 iPad7,3 CFNetwork/1335.0.3 Darwin/21.6.0",
  "AppleCoreMedia/1.0.0.15G77 (iPhone; U; CPU OS 11_4_1 like Mac OS X; en_us)",
  "Applebot/0.1 (+http://www.apple.com/go/applebot)",
  "Deezer/8.13.0.4 CFNetwork/1125.2 Darwin/19.4.0",
  "Deezer/6.2.2.80 (Android; 9; Mobile; fr) samsung SM-G950F",
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "GooglePodcasts/2.0.10 iPhone/14.6 hw/iPhone12_1",
  "GSA/11.31.12.21.arm64",
  "Pocket Casts",
  "Podbean/Android App 8.1.5 (http://podbean.com)",
  "Podbean/iOS (http://podbean.com) 5.2.0 - 19c4ff292bd09cd2ccbad22cc6755a45",
  "PodcastAddict/v5 ( https://podcastaddict.com/; Android podcast app)",
  "Overcast/3.0 (+http://overcast.fm/; iOS podcast app)",
  "Spotify/8.7.10 iOS/15.3.1 (iPhone13,2)",
  "Spotify/1.0",
  "TuneIn Radio/24.2 (Linux;Android 10) ExoPlayerLib/2.11.4",
  "TuneIn Radio/1366 CFNetwork/1121.2.2 Darwin/19.3.0",
  "Stitcher/Android",
  "Stitcher/iOS",
  "Podkicker Pro",
  "VLC/3.0.8 LibVLC/3.0.8",
  "Mozilla/5.0 (compatible; SemrushBot/6~bl; http://www.semrush.com/bot.html)",
  "Mozilla/5.0 (compatible; DotBot/1.2; https://opensiteexplorer.org/dotbot; help@moz.com)",
  "Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)",
  "Mozilla/5.0 (compatible; Neevabot/1.0; https://neeva.com/neevabot)",
  "Mozilla/5.0 (compatible; archive.org_bot http://archive.org/details/archive.org_bot)",
];

const pickUserAgent = (idx: number) => USER_AGENTS[idx % USER_AGENTS.length];

async function fetchPage(page: number, attempt = 1, userAgent?: string): Promise<unknown[]> {
  const url = `${BASE}${SEARCH_PATH}&page=${page}`;
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": userAgent ?? pickUserAgent(page),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: BASE,
        "Cache-Control": "no-cache",
      },
      timeout: 10_000,
    });

    const $ = load(res.data);
    const items = $(".productItem");

    if (page === 1) {
      console.log("Status:", res.status);
      console.log("Found product elements:", items.length);
      items.slice(0, 1).each((idx, el) => {
        console.log(`\n--- Product raw #${idx + 1} ---`);
        console.log(truncate($.html(el), 1200));
      });
    }

    const products = items
      .map((_, el) => {
        const node = $(el);

        const name =
          node.find(".productName a").first().text().trim() ||
          node.find(".productName").first().text().trim() ||
          null;

        const brand =
          node.find(".productMarka").first().text().trim() || null;

        const imgEl = node.find(".productImage img").first();
        const imgSrc =
          imgEl.attr("data-original") ||
          imgEl.attr("data-src") ||
          imgEl.attr("src") ||
          null;
        const image = absolute(imgSrc);

        return {
          name,
          brand,
          image,
        };
      })
      .get();

    return products;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; headers?: Record<string, string> } };
    const status: number | undefined = err?.response?.status;
    if ((status === 429 || status === 403) && attempt <= 4) {
      const retryHeader = err.response?.headers?.["retry-after"];
      const retrySeconds =
        typeof retryHeader === "string" ? Number(retryHeader) || 0 : 0;
      const backoffMs =
        Math.max(retrySeconds * 1000, 7_000 * attempt) +
        Math.floor(Math.random() * 1500);
      console.warn(
        `Blocked/rate-limited on page ${page} (status ${status}, attempt ${attempt}), waiting ${backoffMs}ms...`
      );
      await sleep(backoffMs);
      const nextUa = pickUserAgent(page + attempt);
      return fetchPage(page, attempt + 1, nextUa);
    }

    console.error(
      `Failed to fetch page ${page} (status: ${status ?? "unknown"}):`,
      (error as Error)?.message ?? error
    );
    return [];
  }
}

const MAX_PAGES = 105;
const CONCURRENCY = 1;

const all: unknown[] = [];
let nextPage = 1;
let stop = false;

const getNextPage = () => {
  if (stop || nextPage > MAX_PAGES) return null;
  return nextPage++;
};

async function worker(workerId: number) {
  while (!stop) {
    const page = getNextPage();
    if (page === null) break;

    const userAgent = pickUserAgent(page + workerId);
    const products = await fetchPage(page, 1, userAgent);

    if (!products.length) {
      console.log(`Page ${page}: no items, stopping.`);
      stop = true;
      break;
    }

    all.push(...products);
    console.log(
      `Worker ${workerId} page ${page}: fetched ${products.length}, total ${all.length}`
    );

    // Respectful crawl: small randomized delay between pages to reduce rate limiting
    const delay = 2_000 + Math.random() * 2_000;
    await sleep(delay);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

console.log("\nSample products:");
console.dir(all.slice(0, 5), { depth: null });

console.log("\nTotal products collected:", all.length);

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT_FILE, JSON.stringify(all, null, 2), "utf8");
console.log(`Saved ${all.length} products to ${OUTPUT_FILE}`);
