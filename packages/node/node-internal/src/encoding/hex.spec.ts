// https://github.com/denoland/deno_std/blob/main/encoding/hex_test.ts
// Ported from Go
// https://github.com/golang/go/blob/go1.12.5/src/encoding/hex/hex.go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { describe, it, expect } from '@gjsify/unit';

import { decode, encode } from "./hex.js";

const testCases = [
  // encoded(hex) / decoded(Uint8Array)
  ["", []],
  ["0001020304050607", [0, 1, 2, 3, 4, 5, 6, 7]],
  ["08090a0b0c0d0e0f", [8, 9, 10, 11, 12, 13, 14, 15]],
  ["f0f1f2f3f4f5f6f7", [0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7]],
  ["f8f9fafbfcfdfeff", [0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff]],
  ["67", Array.from(new TextEncoder().encode("g"))],
  ["e3a1", [0xe3, 0xa1]],
];

const errCases: [string, ErrorConstructor, string][] = [
  // encoded(hex) / error / msg
  ["0", RangeError, ""],
  ["zd4aa", TypeError, "'z'"],
  ["d4aaz", TypeError, "'z'"],
  ["30313", RangeError, ""],
  ["0g", TypeError, "'g'"],
  ["00gg", TypeError, "'g'"],
  ["0\x01", TypeError, "'\x01'"],
  ["ffeed", RangeError, ""],
];

export default async () => {
  await describe("encoding.hex", async () => {

    await it("encode", async () => {
      {
        const srcStr = "abc";
        const src = new TextEncoder().encode(srcStr);
        const dest = encode(src);
        expect(src).toEqualArray(new Uint8Array([97, 98, 99]));
        expect(dest.length).toBe(6);
      }

      for (const [enc, dec] of testCases) {
        const src = new Uint8Array(dec as number[]);
        const dest = encode(src);
        expect(dest.length).toBe(src.length * 2);
        expect(new TextDecoder().decode(dest)).toBe(enc);
      }
    });

    await it("decode", async () => {
      // Case for decoding uppercase hex characters, since
      // Encode always uses lowercase.
      const extraTestcase = [
        ["F8F9FAFBFCFDFEFF", [0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff]],
      ];

      const cases = testCases.concat(extraTestcase);

      for (const [enc, dec] of cases) {
        const src = new TextEncoder().encode(enc as string);
        const dest = decode(src);
        expect(Array.from(dest)).toEqualArray(Array.from(dec as number[]));
      }
    });

    await it("decode error", async () => {
      for (const [input, expectedErr, msg] of errCases) {
        expect(
          () => decode(new TextEncoder().encode(input)),
        ).toThrow(expectedErr); // TODO support error expected message `msg`
      }
    });
  });
}