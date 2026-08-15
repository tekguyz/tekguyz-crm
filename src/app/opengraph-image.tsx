// src/app/opengraph-image.tsx
//
// Dynamic OG card. Rendered by next/og (satori) so the wordmark uses the real
// Inter, not a substitute. A static PNG would bake in whatever font the
// generating machine happened to have — this cannot drift.
//
// Requires: npm i @fontsource/inter
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "TEKGUYZ CRM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ICON_SVG_B64 =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjQ1LjAwIDY3LjAwIDQyMi4wMCA0MjguMDAiIHdpZHRoPSI0MjIiIGhlaWdodD0iNDI4IiByb2xlPSJpbWciIGFyaWEtbGFiZWxsZWRieT0idCI+PHRpdGxlIGlkPSJ0Ij5URUtHVVlaIENSTTwvdGl0bGU+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMUExQTFBIiBzdHJva2Utd2lkdGg9IjIyLjAiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBvbHlnb24gcG9pbnRzPSI3NS4yOSwyNzIuMDAgNDM2LjcxLDI3Mi4wMCAyOTAuMDAsNDAyLjAwIDI5MC4wMCw0NzYuMDAgMjIyLjAwLDQ3Ni4wMCAyMjIuMDAsNDAyLjAwIiBmaWxsPSIjM0I2RkUwIiBzdHJva2U9Im5vbmUiLz48cG9seWdvbiBwb2ludHM9IjY0LjAwLDIwNi4wMCA0NDguMDAsMjA2LjAwIDQ0OC4wMCwyNjIuMDAgMjkwLjAwLDQwMi4wMCAyOTAuMDAsNDc2LjAwIDIyMi4wMCw0NzYuMDAgMjIyLjAwLDQwMi4wMCA2NC4wMCwyNjIuMDAiLz48bGluZSB4MT0iNzUuMjkiIHkxPSIyNzIuMCIgeDI9IjQzNi43MSIgeTI9IjI3Mi4wIiBzdHJva2Utd2lkdGg9IjIwLjAiLz48bGluZSB4MT0iMjU2LjAiIHkxPSIxNzIuMCIgeDI9IjI1Ni4wIiB5Mj0iMzA2LjAiIHN0cm9rZS13aWR0aD0iMzIuMCIvPjxsaW5lIHgxPSIxNDguMCIgeTE9IjIwMi4wIiB4Mj0iMjU2LjAiIHkyPSIzMDYuMCIgc3Ryb2tlLXdpZHRoPSIzMi4wIi8+PGxpbmUgeDE9IjM2NC4wIiB5MT0iMjAyLjAiIHgyPSIyNTYuMCIgeTI9IjMwNi4wIiBzdHJva2Utd2lkdGg9IjMyLjAiLz48bGluZSB4MT0iMjU2LjAiIHkxPSIxNzIuMCIgeDI9IjI1Ni4wIiB5Mj0iMzA2LjAiIHN0cm9rZT0iIzJGQTY3OSIgc3Ryb2tlLXdpZHRoPSIxNS4wIi8+PGxpbmUgeDE9IjE0OC4wIiB5MT0iMjAyLjAiIHgyPSIyNTYuMCIgeTI9IjMwNi4wIiBzdHJva2U9IiMyRkE2NzkiIHN0cm9rZS13aWR0aD0iMTUuMCIvPjxsaW5lIHgxPSIzNjQuMCIgeTE9IjIwMi4wIiB4Mj0iMjU2LjAiIHkyPSIzMDYuMCIgc3Ryb2tlPSIjMkZBNjc5IiBzdHJva2Utd2lkdGg9IjE1LjAiLz48cG9seWdvbiBwb2ludHM9IjI1Ni4wMCw4NC4wMCAyOTQuMTEsMTA2LjAwIDI5NC4xMSwxNTAuMDAgMjU2LjAwLDE3Mi4wMCAyMTcuODksMTUwLjAwIDIxNy44OSwxMDYuMDAiIGZpbGw9IiMyRkE2NzkiIHN0cm9rZS13aWR0aD0iMTguMCIvPjxwb2x5Z29uIHBvaW50cz0iMTQ4LjAwLDE1OC4wMCAxODYuMTEsMTgwLjAwIDE4Ni4xMSwyMjQuMDAgMTQ4LjAwLDI0Ni4wMCAxMDkuODksMjI0LjAwIDEwOS44OSwxODAuMDAiIGZpbGw9IiMyRkE2NzkiIHN0cm9rZS13aWR0aD0iMTguMCIvPjxwb2x5Z29uIHBvaW50cz0iMzY0LjAwLDE1OC4wMCA0MDIuMTEsMTgwLjAwIDQwMi4xMSwyMjQuMDAgMzY0LjAwLDI0Ni4wMCAzMjUuODksMjI0LjAwIDMyNS44OSwxODAuMDAiIGZpbGw9IiMyRkE2NzkiIHN0cm9rZS13aWR0aD0iMTguMCIvPjxsaW5lIHgxPSIyNTYuMCIgeTE9IjMwMi4wIiB4Mj0iMjU2LjAiIHkyPSIzNzIuMCIgc3Ryb2tlLXdpZHRoPSIyMi4wIi8+PHBvbHlnb24gcG9pbnRzPSIyMjAuMDAsMzY4LjAwIDI5Mi4wMCwzNjguMDAgMjU2LjAwLDQyNi4wMCIgZmlsbD0iIzFBMUExQSIgc3Ryb2tlPSJub25lIi8+PC9nPjwvc3ZnPg==";

function loadInter(weight: "Bold" | "Medium") {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      `node_modules/@fontsource/inter/files/inter-latin-${
        weight === "Bold" ? "700" : "500"
      }-normal.woff`,
    ),
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      // One centred vertical stack. The previous layout put the icon and the
      // text side by side and pinned the pair to the left edge, which left the
      // tagline trailing off to the right of the mark instead of reading as
      // part of the same unit. Link previews are cropped and scaled hard by
      // every platform that renders them, so a centred block survives that
      // better than an edge-anchored one.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={264}
          height={264}
          alt=""
          src={`data:image/svg+xml;base64,${ICON_SVG_B64}`}
        />
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: "-0.015em",
            color: "#1A1A1A",
            lineHeight: 1,
            marginTop: 44,
          }}
        >
          TEKGUYZ CRM
        </div>
        {/* Hairline, not extra whitespace — the design system builds structure
            from rules rather than gaps, and it separates the two type roles at
            the small sizes these cards are actually viewed at. */}
        <div
          style={{
            width: 96,
            height: 1,
            background: "#D9D9DE",
            marginTop: 34,
          }}
        />
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: 36,
            letterSpacing: "0.01em",
            color: "#6B6B72",
            marginTop: 34,
          }}
        >
          Every lead, one pipeline.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: loadInter("Bold"), weight: 700, style: "normal" },
        { name: "Inter", data: loadInter("Medium"), weight: 500, style: "normal" },
      ],
    },
  );
}
