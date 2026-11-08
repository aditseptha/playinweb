import assert from "node:assert/strict";
import { test } from "node:test";

const {
  LANDSCAPE,
  clipError,
  coverAudit,
  coverBelowStandard,
  focalOrCenter,
  mp4Facts,
  readImageSize,
  stillImageError,
} = await import("./media-standard.ts");

test("focal point defaults to the center and stays inside the frame", () => {
  assert.deepEqual(focalOrCenter(undefined, null), { x: 0.5, y: 0.5 });
  assert.deepEqual(focalOrCenter(-2, "1.4"), { x: 0, y: 1 });
  assert.deepEqual(focalOrCenter(0.25, 0.8), { x: 0.25, y: 0.8 });
});

test("new landscape covers must clear 1280×720", () => {
  assert.match(
    stillImageError({ role: "landscape", bytes: 1000, width: 320, height: 180, mime: "image/jpeg", detected: "jpeg" }) ?? "",
    /1280×720/,
  );
  assert.equal(
    stillImageError({
      role: "landscape",
      bytes: 1000,
      width: LANDSCAPE.minWidth,
      height: LANDSCAPE.minHeight,
      mime: "image/png",
      detected: "png",
    }),
    null,
  );
});

test("screenshots keep a minimum width and GIFs are sent to the preview clip", () => {
  assert.match(
    stillImageError({ role: "screenshot", bytes: 1000, width: 800, height: 600, mime: "image/webp", detected: "webp" }) ?? "",
    /960/,
  );
  assert.match(
    stillImageError({ role: "screenshot", bytes: 1000, width: 1200, height: 800, mime: "image/gif", detected: "gif" }) ?? "",
    /preview clip/,
  );
  assert.equal(
    stillImageError({ role: "screenshot", bytes: 1000, width: 1280, height: 720, mime: "image/jpeg", detected: "jpeg" }),
    null,
  );
});

test("preview clips are short, silent, and at most 720p", () => {
  assert.match(clipError({ bytes: 1000, mime: "video/mp4", detected: "mp4", duration: 2, hasAudio: false, height: 720 }) ?? "", /3 and 10/);
  assert.match(clipError({ bytes: 1000, mime: "video/mp4", detected: "mp4", duration: 5, hasAudio: true, height: 720 }) ?? "", /silent/);
  assert.match(clipError({ bytes: 1000, mime: "video/webm", detected: "webm", duration: 5, hasAudio: false, height: 1080 }) ?? "", /720p/);
  assert.equal(clipError({ bytes: 1000, mime: "image/gif", detected: "gif" }), null);
  assert.equal(clipError({ bytes: 1000, mime: "video/mp4", detected: "mp4", duration: 6, hasAudio: false, height: 720 }), null);
});

test("cover audit flags soft and off-ratio art", () => {
  assert.deepEqual(coverAudit(1920, 1080), []);
  assert.equal(coverBelowStandard(640, 360), true);
  assert.ok(coverAudit(640, 360).includes("below 1280×720"));
  assert.ok(coverAudit(1600, 1600).includes("not 16:9"));
});

test("image headers report pixel size", () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  assert.deepEqual(readImageSize(png), { type: "png", width: 1, height: 1 });

  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03,
    0x11, 0x00,
  ]);
  assert.deepEqual(readImageSize(jpeg), { type: "jpeg", width: 32, height: 16 });

  const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x2c, 0x01, 0x90, 0x01]);
  assert.deepEqual(readImageSize(gif), { type: "gif", width: 300, height: 400 });
});

test("mp4 facts read duration, size, and an audio track", () => {
  const silent = sampleMp4({ audio: false, seconds: 5 });
  const quiet = mp4Facts(silent);
  assert.equal(quiet?.hasAudio, false);
  assert.equal(quiet?.duration, 5);
  assert.equal(quiet?.width, 1280);
  assert.equal(quiet?.height, 720);

  const withAudio = mp4Facts(sampleMp4({ audio: true, seconds: 5 }));
  assert.equal(withAudio?.hasAudio, true);
});

function box(type, payload) {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(payload, 8);
  return out;
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function sampleMp4({ audio, seconds }) {
  const ftyp = box("ftyp", new Uint8Array(8));
  const mvhd = new Uint8Array(20);
  mvhd[12] = 0;
  mvhd[13] = 0;
  mvhd[14] = 0x03;
  mvhd[15] = 0xe8;
  mvhd[16] = 0;
  mvhd[17] = 0;
  mvhd[18] = seconds === 5 ? 0x13 : 0;
  mvhd[19] = seconds === 5 ? 0x88 : 0;
  const tkhd = new Uint8Array(84);
  const view = new DataView(tkhd.buffer);
  view.setUint32(76, 1280 * 65536);
  view.setUint32(80, 720 * 65536);
  const hdlr = new Uint8Array(12);
  hdlr.set(new TextEncoder().encode(audio ? "soun" : "vide"), 8);
  const minf = box("minf", box("hdlr", hdlr));
  const mdia = box("mdia", minf);
  const trak = box("trak", concat([box("tkhd", tkhd), mdia]));
  const moov = box("moov", concat([box("mvhd", mvhd), trak]));
  return concat([ftyp, moov]);
}
