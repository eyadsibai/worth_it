import { test, expect, type Page } from "@playwright/test";

/**
 * Matches the hot-reload runtime Next.js injects only under `next dev`
 * (`hmr-client` under Turbopack, `webpack-hmr`/`react-refresh` under Webpack).
 * A production build never ships it, so misdetection can only point the wrong
 * way: an unrecognised dev server makes the build-sensitive tests below fail
 * loudly, it can never make them skip silently against production.
 */
const DEV_ONLY_RUNTIME = /hmr[-_]?client|webpack-hmr|react-refresh|\/_next\/static\/development\//i;

/**
 * `next dev` and `next start` are different products where performance is
 * concerned: dev emits one unminified chunk per module, compiles routes on
 * first request, and sends `Cache-Control: no-store` for `_next/static/chunks`.
 * Asserting on caching or bundle cost against dev measures the dev server, not
 * this app, so those tests skip unless the target is a real production build.
 * `playwright.config.prod.ts` builds and serves one.
 */
async function servedByDevServer(page: Page): Promise<boolean> {
  return page.evaluate((pattern) => {
    const devRuntime = new RegExp(pattern, "i");
    // A URL may carry a `%` that is not a valid escape sequence, and
    // decodeURIComponent throws URIError on those. Unguarded, one such entry
    // aborts `some` and surfaces as a page.evaluate failure in whichever
    // performance test happened to ask -- so fall back to the undecoded name,
    // which still carries everything the pattern looks for.
    const readable = (name: string) => {
      try {
        return decodeURIComponent(name);
      } catch {
        return name;
      }
    };

    return performance
      .getEntriesByType("resource")
      .some((entry) => devRuntime.test(readable(entry.name)));
  }, DEV_ONLY_RUNTIME.source);
}

test.describe("Performance Tests", () => {
  test("dev-server detection survives a resource URL that is not valid percent-encoding", async ({
    page,
  }) => {
    await page.goto("/");

    // `%E0%A4%A` is a truncated escape: legal in a URL, but decodeURIComponent
    // throws URIError on it. That error escapes `some` and page.evaluate, so a
    // single such request fails every build-sensitive test in this file with
    // something that has nothing to do with performance.
    //
    // The entry is stubbed rather than really requested because neither real
    // route can prove anything: under `next dev` the hmr chunk already sits
    // earlier in the timeline and short-circuits `some` before the malformed
    // name is reached, and clearing the buffer to isolate a probe stops the
    // browser recording new entries at all.
    const stubResourceEntries = (name: string) =>
      page.evaluate((entryName) => {
        (performance as unknown as { getEntriesByType: unknown }).getEntriesByType = (
          type: string
        ) => (type === "resource" ? [{ name: entryName }] : []);
      }, name);

    await stubResourceEntries(`${new URL(page.url()).origin}/chunk-%E0%A4%A.js`);
    expect(await servedByDevServer(page)).toBe(false);

    // Falling back to the raw name, not to `false`: a URL that fails to decode
    // is still evidence of a dev server when it names the dev runtime.
    await stubResourceEntries(
      `${new URL(page.url()).origin}/_next/static/chunks/hmr-client-%E0%A4%A.js`
    );
    expect(await servedByDevServer(page)).toBe(true);
  });

  test("should load quickly", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should have optimized bundle size", async ({ page }) => {
    const resources: Array<{ url: string; size: number }> = [];

    // Track resource sizes
    page.on("response", (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentLength = headers["content-length"];

      if (contentLength && (url.includes(".js") || url.includes(".css"))) {
        resources.push({
          url,
          size: parseInt(contentLength),
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Calculate total bundle size
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    // Not a page.url() check: next dev and next start both serve :3000, so the
    // old `isProduction` was true under either and gated nothing - the budget
    // was being applied to dev's unminified one-chunk-per-module graph, which
    // says nothing about what ships.
    test.skip(
      await servedByDevServer(page),
      "next dev serves unminified chunks per module, so total transfer size is not the shipped bundle; run under playwright.config.prod.ts"
    );

    expect(totalSizeMB).toBeLessThan(2); // 2MB threshold for all JS/CSS
  });

  test("should have good Core Web Vitals", async ({ page }) => {
    await page.goto("/");

    interface WebVitalsMetrics {
      lcp: number;
      fid: number;
      cls: number;
      fcp: number;
      ttfb: number;
    }

    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise<WebVitalsMetrics>((resolve) => {
        let lcp = 0;
        let fid = 0;
        let cls = 0;
        let fcp = 0;
        let ttfb = 0;

        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });

        // First Input Delay (simulated)
        window.addEventListener(
          "click",
          () => {
            fid = performance.now();
          },
          { once: true }
        );

        // Cumulative Layout Shift
        interface LayoutShiftEntry extends PerformanceEntry {
          hadRecentInput: boolean;
          value: number;
        }
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const layoutShift = entry as LayoutShiftEntry;
            if (!layoutShift.hadRecentInput) {
              cls += layoutShift.value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });

        // First Contentful Paint & Time to First Byte
        const paintEntries = performance.getEntriesByType("paint");
        for (const entry of paintEntries) {
          if (entry.name === "first-contentful-paint") {
            fcp = entry.startTime;
          }
        }

        const navEntries = performance.getEntriesByType(
          "navigation"
        ) as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          ttfb = navEntries[0].responseStart;
        }

        // Wait a bit for metrics to be collected
        setTimeout(() => {
          resolve({
            lcp,
            fid,
            cls,
            fcp,
            ttfb,
          });
        }, 2000);
      });
    });

    // Check Core Web Vitals thresholds
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s is good
    expect(metrics.cls).toBeLessThan(0.1); // CLS < 0.1 is good
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s is good
    expect(metrics.ttfb).toBeLessThan(800); // TTFB < 0.8s is good
  });

  test("should cache static assets", async ({ page }) => {
    // Listen before the first navigation: the test context starts with a cold
    // HTTP cache, so this is the one load where every asset is fetched over the
    // wire and its caching contract is observable.
    const advertisedCaching = new Map<string, string>();

    page.on("response", (response) => {
      if (response.url().includes("/_next/static/")) {
        advertisedCaching.set(response.url(), response.headers()["cache-control"] ?? "");
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    test.skip(
      await servedByDevServer(page),
      "next dev serves /_next/static/chunks with `Cache-Control: no-store, must-revalidate` by design; run under playwright.config.prod.ts to exercise real asset caching"
    );

    // Build output is content-hashed, so it must be cacheable without
    // revalidation. Exact numbers are not pinned -- the regression this guards
    // against is `no-store`/`no-cache`/`max-age=0` creeping into the config.
    const oneDay = 60 * 60 * 24;
    expect(advertisedCaching.size).toBeGreaterThan(0);
    for (const [url, cacheControl] of advertisedCaching) {
      const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 0);
      expect(cacheControl, `${url} must be cacheable`).not.toMatch(/no-store|no-cache/);
      expect(maxAge, `${url} must stay fresh for at least a day`).toBeGreaterThanOrEqual(oneDay);
    }

    await page.reload();
    await page.waitForLoadState("networkidle");

    // And the browser must actually reuse them. A hit on a fingerprinted
    // `immutable` asset is a silent zero-byte read, never a 304 -- counting 304s
    // here would prove nothing, because a correctly cached asset is never
    // revalidated in the first place.
    const reuse = await page.evaluate(() => {
      const buildAssets = (
        performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      ).filter((entry) => entry.name.includes("/_next/static/"));

      return {
        total: buildAssets.length,
        fromCache: buildAssets.filter((entry) => entry.transferSize === 0).length,
      };
    });

    expect(reuse.total).toBeGreaterThan(0);
    expect(reuse.fromCache, "reload refetched every build asset from the network").toBeGreaterThan(
      0
    );
  });

  test("should handle slow network gracefully", async ({ page, context }) => {
    // Simulate slow 3G
    await context.route("**/*", (route) => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });

    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Critical content should be visible
    const mainContent = page.locator("main, #__next").first();
    await expect(mainContent).toBeVisible();
  });

  test("should not have memory leaks", async ({ page }) => {
    await page.goto("/");

    interface PerformanceWithMemory extends Performance {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      const perf = performance as PerformanceWithMemory;
      if (perf.memory) {
        return perf.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Perform multiple interactions. Every `Field` on the Ledger landing is a
    // plain `type="text"` input (blur-parsed, not `type="number"` -- that
    // selector matched a pre-redesign form and finds nothing here now), and
    // the first `button` in DOM order is the command palette's "Search ⌘K"
    // trigger: clicking it repeatedly opens a modal dialog whose backdrop then
    // intercepts every later click, which is what was crashing this test
    // rather than exercising real interactions. "Toggle theme" is a stable,
    // always-visible, non-modal control that still forces a real re-render on
    // every click, so it stands in for "click buttons" here.
    for (let i = 0; i < 5; i++) {
      // Fill a real field
      const salaryInput = page.getByLabel("Monthly salary").first();
      if (await salaryInput.isVisible()) {
        await salaryInput.fill(String(Math.round(Math.random() * 10000)));
        await salaryInput.blur();
      }

      // Click a button that doesn't open a modal
      const themeButton = page.getByRole("button", { name: /toggle theme/i });
      if ((await themeButton.isVisible()) && (await themeButton.isEnabled())) {
        await themeButton.click().catch(() => {});
      }

      await page.waitForTimeout(500);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      interface GlobalWithGC {
        gc?: () => void;
      }
      const globalWithGC = globalThis as GlobalWithGC;
      if (typeof globalWithGC.gc === "function") {
        globalWithGC.gc();
      }
    });

    // Check memory after interactions
    const finalMemory = await page.evaluate(() => {
      interface PerformanceWithMemory extends Performance {
        memory?: { usedJSHeapSize: number };
      }
      const perf = performance as PerformanceWithMemory;
      if (perf.memory) {
        return perf.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory shouldn't increase dramatically
    const memoryIncrease = finalMemory - initialMemory;
    const increaseRatio = memoryIncrease / initialMemory;

    // Less than 50% increase is acceptable
    expect(increaseRatio).toBeLessThan(0.5);
  });

  test("should optimize images", async ({ page }) => {
    const images: Array<{ url: string; size: number }> = [];

    page.on("response", (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentType = headers["content-type"] || "";
      const contentLength = headers["content-length"];

      if (contentType.includes("image") && contentLength) {
        images.push({
          url,
          size: parseInt(contentLength),
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Without this the loop below body-passes on an empty list, reporting a
    // green image-optimisation check for a page that requested no images.
    test.skip(images.length === 0, "the page requested no images, so there is nothing to assert");

    // Check image optimization
    for (const image of images) {
      const sizeMB = image.size / (1024 * 1024);

      // Images should be optimized (under 500KB each)
      expect(sizeMB).toBeLessThan(0.5);

      // Asserted unconditionally: the old localhost:3000 guard was true under
      // both next dev and next start, so it never gated anything, and
      // next/image serves modern formats in dev too.
      const isModernFormat =
        image.url.includes(".webp") ||
        image.url.includes(".avif") ||
        image.url.includes("_next/image") ||
        image.url.includes(".svg");

      expect(isModernFormat, `${image.url} is not a modern image format`).toBeTruthy();
    }
  });

  test("should minimize JavaScript execution time", async ({ page }) => {
    await page.goto("/");
    // networkidle, not just `load`: chunks pulled in during hydration are part
    // of the cost being measured.
    await page.waitForLoadState("networkidle");

    test.skip(
      await servedByDevServer(page),
      "next dev compiles routes on demand and emits one chunk per module, so this measures compile time and an unbundled graph rather than the shipped bundle; run under playwright.config.prod.ts"
    );

    const metrics = await page.evaluate(() => {
      const scripts = (
        performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      ).filter((entry) => entry.name.includes(".js"));

      return {
        scriptCount: scripts.length,
        // Resource `duration` is request-start to response-end, so this is the
        // cost of getting script bytes ready to run, summed across chunks -- not
        // V8 execution time, despite the test name.
        totalTime: scripts.reduce((total, script) => total + script.duration, 0),
      };
    });

    expect(metrics.totalTime).toBeLessThan(2000);

    // A production build bundles the module graph; dozens of chunks means code
    // splitting has regressed into request waterfalls.
    expect(metrics.scriptCount).toBeLessThan(20);
  });

  test("should have no render-blocking resources", async ({ page }) => {
    const renderBlockingResources: string[] = [];

    page.on("response", (response) => {
      const url = response.url();

      // Check for render-blocking CSS in head
      if (url.includes(".css") && !url.includes("async")) {
        renderBlockingResources.push(url);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for render-blocking scripts
    const blockingScripts = await page.evaluate(() => {
      const scripts = document.querySelectorAll<HTMLScriptElement>(
        "script:not([async]):not([defer])"
      );
      return Array.from(scripts).filter((s) => s.src && !s.src.includes("_next")).length;
    });

    // Minimal render-blocking resources
    expect(blockingScripts).toBe(0);
    expect(renderBlockingResources.length).toBeLessThan(3);
  });
});
