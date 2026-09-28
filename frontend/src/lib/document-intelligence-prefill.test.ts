import assert from "node:assert/strict";
import test from "node:test";

const prefillModule = await import(
  new URL("./document-intelligence-prefill.ts", import.meta.url).href
);

function withMockWindow<T>(fn: () => T): T {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const store = new Map<string, string>();

  (globalThis as typeof globalThis & { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  } as Window & typeof globalThis;

  try {
    return fn();
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    } else {
      (globalThis as typeof globalThis & { window: unknown }).window = originalWindow;
    }
  }
}

test("document intelligence prefill saves and consumes once", () => {
  withMockWindow(() => {
    const {
      createDocumentIntelligencePrefillToken,
      saveDocumentIntelligencePrefill,
      consumeDocumentIntelligencePrefill,
    } = prefillModule as {
      createDocumentIntelligencePrefillToken: () => string;
      saveDocumentIntelligencePrefill: (
        token: string,
        payload: unknown,
      ) => void;
      consumeDocumentIntelligencePrefill: (token: string) => unknown | null;
    };

    const token = createDocumentIntelligencePrefillToken();
    saveDocumentIntelligencePrefill(token, {
      kind: "risk",
      title: "Risiko A",
      description: "Deskripsi A",
      quote: "Kutipan sumber",
    });

    const first = consumeDocumentIntelligencePrefill(token);
    assert.equal(first?.kind, "risk");
    assert.equal(first?.title, "Risiko A");
    assert.equal(first?.description, "Deskripsi A");
    assert.equal(first?.quote, "Kutipan sumber");

    const second = consumeDocumentIntelligencePrefill(token);
    assert.equal(second, null);
  });
});

test("document intelligence prefill ignores blank stored payloads", () => {
  withMockWindow(() => {
    const { consumeDocumentIntelligencePrefill } = prefillModule as {
      consumeDocumentIntelligencePrefill: (token: string) => unknown | null;
    };

    const token = "blank-token";
    window.localStorage.setItem(
      `manris:document-intelligence-prefill:${token}`,
      "   ",
    );

    const value = consumeDocumentIntelligencePrefill(token);
    assert.equal(value, null);
  });
});
