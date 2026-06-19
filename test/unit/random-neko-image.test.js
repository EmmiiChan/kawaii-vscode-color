const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRandomNekoImageFetcher,
  getImageExtensionFromResponse,
  getRandomNekoImageFromPayload,
  getRandomNekoImageUrl
} = require("../../out/src/randomNekoImage");

test("random neko fetcher normalizes a mocked API image without using external network", async () => {
  const fetchRandomNekoImage = createRandomNekoImageFetcher({
    endpoint: "https://nekos.moe/api/v1/random/image?nsfw=false",
    imageMaxBytes: 200,
    requestJson(url, redirectsRemaining) {
      assert.equal(url, "https://nekos.moe/api/v1/random/image?nsfw=false");
      assert.equal(redirectsRemaining, 3);
      return Promise.resolve({
        images: [{ id: "safe-id", image_url: "https://nekos.moe/image/safe-id.png" }]
      });
    },
    requestBuffer(url, maxBytes, redirectsRemaining) {
      assert.equal(url, "https://nekos.moe/image/safe-id.png");
      assert.equal(maxBytes, 200);
      assert.equal(redirectsRemaining, 3);
      return Promise.resolve({
        body: Buffer.from("png-bytes"),
        contentType: "image/png"
      });
    }
  });

  const image = await fetchRandomNekoImage();

  assert.equal(image.extension, "png");
  assert.equal(image.mimeType, "image/png");
  assert.equal(image.originalName, "nekos.moe_safe-id.png");
  assert.equal(image.imageBuffer.toString("utf8"), "png-bytes");
});

test("random neko payload validation rejects missing image data", () => {
  assert.throws(() => getRandomNekoImageFromPayload({ images: [] }), /returned no images/);
  assert.throws(() => getRandomNekoImageFromPayload({ images: [{}] }), /without a valid id/);
});

test("random neko URL and extension helpers use safe fallbacks", () => {
  assert.equal(
    getRandomNekoImageUrl({ id: "a b" }),
    "https://nekos.moe/image/a%20b"
  );
  assert.equal(
    getRandomNekoImageUrl({ id: "ignored", image_url: "https://nekos.moe/custom/image.webp" }),
    "https://nekos.moe/custom/image.webp"
  );
  assert.equal(getImageExtensionFromResponse("image/jpeg; charset=utf-8", "https://nekos.moe/image/file"), "jpg");
  assert.equal(getImageExtensionFromResponse("", "https://nekos.moe/image/file.webp"), "webp");
  assert.equal(getImageExtensionFromResponse("", "https://nekos.moe/image/file"), "jpg");
});

test("random neko fetcher propagates controlled request failures", async () => {
  const fetchRandomNekoImage = createRandomNekoImageFetcher({
    requestJson() {
      return Promise.reject(new Error("network disabled in test"));
    }
  });

  await assert.rejects(fetchRandomNekoImage(), /network disabled in test/);
});
