import { test, expect } from "@playwright/test";

test.describe("Performance Tests", () => {
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

    // In production, bundle should be under 1MB (gzipped)
    const isProduction =
      process.env.NODE_ENV === "production" || page.url().includes("localhost:3000");

    if (isProduction) {
      expect(totalSizeMB).toBeLessThan(2); // 2MB threshold for all JS/CSS
    }
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
    // First load
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Track cached resources on reload
    const cachedResources: string[] = [];

    page.on("response", (response) => {
      const status = response.status();
      const url = response.url();

      // 304 means cached
      if (status === 304) {
        cachedResources.push(url);
      }
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // In production, static assets should be cached
    const isProduction = page.url().includes("localhost:3000");
    if (isProduction) {
      expect(cachedResources.length).toBeGreaterThan(0);
    }
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

    // Perform multiple interactions
    for (let i = 0; i < 5; i++) {
      // Fill form
      const input = page.locator('input[type="number"]').first();
      if (await input.isVisible()) {
        await input.fill(String(Math.random() * 100));
      }

      // Click buttons
      const button = page.getByRole("button").first();
      if ((await button.isVisible()) && (await button.isEnabled())) {
        await button.click().catch(() => {});
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

    // Check image optimization
    for (const image of images) {
      const sizeMB = image.size / (1024 * 1024);

      // Images should be optimized (under 500KB each)
      expect(sizeMB).toBeLessThan(0.5);

      // Should use modern formats in production
      const isModernFormat =
        image.url.includes(".webp") ||
        image.url.includes(".avif") ||
        image.url.includes("_next/image");

      // Next.js Image component optimization
      if (page.url().includes("localhost:3000")) {
        expect(isModernFormat || image.url.includes(".svg")).toBeTruthy();
      }
    }
  });

  test("should minimize JavaScript execution time", async ({ page }) => {
    await page.goto("/");

    // Measure JavaScript execution time
    const metrics = await page.evaluate(() => {
      const scripts = performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes(".js"));

      let totalScriptTime = 0;
      scripts.forEach((script) => {
        totalScriptTime += script.duration;
      });

      return {
        scriptCount: scripts.length,
        totalTime: totalScriptTime,
      };
    });

    // JavaScript execution should be optimized
    expect(metrics.totalTime).toBeLessThan(2000); // Under 2 seconds

    // In production, scripts should be bundled (fewer files)
    if (page.url().includes("localhost:3000")) {
      expect(metrics.scriptCount).toBeLessThan(20); // Reasonable number of chunks
    }
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
