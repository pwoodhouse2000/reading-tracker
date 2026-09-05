import { test, expect, type Page } from "@playwright/test";
async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { password: "local-e2e-password" },
  });
  expect(response.ok()).toBeTruthy();
  const cookie = response.headers()["set-cookie"].split(";")[0];
  // Production cookies stay Secure. This disposable HTTP-only test server
  // installs the server-signed cookie without that transport flag.
  await page
    .context()
    .addCookies([
      {
        name: "reading-tracker-auth",
        value: cookie.slice(cookie.indexOf("=") + 1),
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
      },
    ]);
}

test("dashboard filtering works across statuses and survives back navigation", async ({
  page,
}) => {
  await page.goto("/books?status=READING");
  await expect(
    page.getByText("Current Voyage", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "📋 To Read", exact: true }).click();
  await expect(
    page.getByText("The Next Adventure", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("No books found", { exact: true })).toHaveCount(
    0,
  );
  await page.getByText("The Next Adventure", { exact: true }).first().click();
  await page.waitForURL("**/books/e2e-queued");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "📋 To Read", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("The Next Adventure", { exact: true }).first(),
  ).toBeVisible();
});

test("private notes stay private; explicit quotes can be shared; export is protected", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await signIn(page);
  const res = await page.request.post("/api/notes", {
    data: {
      bookId: "e2e-reading",
      content: "PRIVATE E2E NOTE",
      tags: "voyage, ideas",
      isQuote: true,
    },
  });
  expect(res.status()).toBe(201);
  const note = await res.json();
  const publicNotes = await (await request.get("/api/notes")).json();
  expect(publicNotes.some((n: { id: string }) => n.id === note.id)).toBeFalsy();
  expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(404);
  const books = await (await request.get("/api/books")).json();
  expect(JSON.stringify(books)).not.toContain("PRIVATE E2E NOTE");
  expect(JSON.stringify(books)).not.toContain("Private test thoughts");
  expect((await request.get("/api/notes/export")).status()).toBe(401);
  expect(
    (
      await page.request.patch(`/api/notes/${note.id}`, {
        data: { isPublic: true },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(200);
  const exported = await page.request.get("/api/notes/export");
  expect(await exported.text()).toContain("#voyage #ideas");
  await page.goto("/notes");
  await page
    .getByPlaceholder("Search notes, quotes, books, authors, or tags...")
    .fill("voyage");
  await expect(
    page.getByText("PRIVATE E2E NOTE", { exact: true }).last(),
  ).toBeVisible();
});

test("rereads preserve dates and annual counts, progress validates, cleanup works", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page);
  const before = await (await page.request.get("/api/stats?year=2026")).json();
  expect(
    (await page.request.post("/api/books/e2e-finished/reread")).status(),
  ).toBe(200);
  const after = await (await page.request.get("/api/stats?year=2026")).json();
  expect(after.yearlyStats.booksFinished).toBe(
    before.yearlyStats.booksFinished,
  );
  await page.goto("/books/e2e-finished");
  await expect(
    page.getByText("Previous readings", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.patch("/api/books/e2e-reading", {
        data: { currentPage: 9999 },
      })
    ).status(),
  ).toBe(400);
  await page.request.patch("/api/books/e2e-reading", {
    data: { status: "PAUSED" },
  });
  await page.request.patch("/api/books/e2e-reading", {
    data: { status: "READING" },
  });
  const book = await (await page.request.get("/api/books/e2e-reading")).json();
  expect(book.dateStarted).toBe("2026-01-01T00:00:00.000Z");
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "Choose my next book" }),
  ).toBeVisible();
  await page.getByLabel("Reading time").selectOption("5");
  await expect(
    page.getByText("The Next Adventure", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("A Quiet Reflection", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/settings/library");
  await expect(
    page.getByRole("heading", { name: "Library cleanup" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change to Fiction" }).first().click();
  await expect(page.getByRole("status")).toContainText("Updated 1 books");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Currently Reading" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update progress" }).first(),
  ).toBeVisible();
  const lastProgress = await page
    .getByRole("button", { name: "Update progress" })
    .last()
    .boundingBox();
  const picker = await page
    .getByRole("heading", { name: "Choose my next book" })
    .boundingBox();
  expect(picker!.y).toBeGreaterThan(lastProgress!.y + lastProgress!.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
});
