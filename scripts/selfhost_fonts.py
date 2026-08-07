#!/usr/bin/env python3
"""Baixa o subset latin das fontes e auto-hospeda em docs/assets/fonts.

Sem CDN: o site nao faz nenhuma requisicao ao Google, o que mantem
coerencia com o banner de consentimento e elimina o risco de fallback.
"""
import pathlib
import re
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

DEST = pathlib.Path("/Users/karlipegomes/Documents/StaffOps/Personal/"
                    "karlipegomes.github.io/docs/assets/fonts")

# (familia, spec google, [(peso, slug)])
WANT = [
    ("Syne",           "Syne:wght@800",               [(800, "syne-800")]),
    ("Public Sans",    "Public+Sans:wght@400;600",    [(400, "publicsans-400"),
                                                       (600, "publicsans-600")]),
    ("JetBrains Mono", "JetBrains+Mono:wght@400;700", [(400, "jetbrainsmono-400"),
                                                       (700, "jetbrainsmono-700")]),
]


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    faces, total = [], 0

    for family, spec, weights in WANT:
        css = get(f"https://fonts.googleapis.com/css2?family={spec}&display=swap")
        blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
        for subset, block in blocks:
            if subset != "latin":
                continue
            w = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
            slug = dict(weights).get(w)
            if not slug:
                continue
            url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
            data = get(url, binary=True)
            (DEST / f"{slug}.woff2").write_bytes(data)
            total += len(data)
            faces.append(
                f"@font-face {{\n"
                f"  font-family: '{family}';\n"
                f"  font-style: normal;\n"
                f"  font-weight: {w};\n"
                f"  font-display: swap;\n"
                f"  src: url('fonts/{slug}.woff2') format('woff2');\n"
                f"  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,\n"
                f"    U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,\n"
                f"    U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n"
                f"}}"
            )
            print(f"  {slug:20s} {len(data)//1024:3d} KB")

    css_path = DEST.parent / "fonts.css"
    css_path.write_text(
        "/* Fontes auto-hospedadas — geradas por scripts/selfhost_fonts.py.\n"
        "   Nao editar a mao; rode o script para atualizar. */\n\n"
        + "\n\n".join(faces) + "\n"
    )
    print(f"\n{len(faces)} faces, {total//1024} KB total")
    print(f"css -> {css_path}")


if __name__ == "__main__":
    main()
