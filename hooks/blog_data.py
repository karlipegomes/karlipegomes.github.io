"""Expõe os posts do blog aos templates Jinja.

O plugin de blog do Material não entrega a lista de posts para páginas
arbitrárias, então a home e a página de séries não teriam como montar
seus índices. Este hook lê `blog.posts` depois que o plugin já resolveu
URLs e tempo de leitura, e publica dois objetos em `config.extra`:

  k_posts   — todos os posts, do mais recente para o mais antigo
  k_series  — séries declaradas via front-matter, já ordenadas

Uma série é declarada no post com:

    series: "#ToolTip — ELK Stack"
    series_index: 3

Posts sem `series` simplesmente não entram em nenhuma.
"""

import posixpath
import re

IMG_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)\)")

# o tema roda em inglês, mas o conteúdo é PT-BR: as datas seguem o conteúdo
MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
         "jul", "ago", "set", "out", "nov", "dez"]


def _date_label(date):
    if not date:
        return ""
    return f"{date.day:02d} {MESES[date.month - 1]} {date.year}"


def _thumb_url(post, files):
    """URL da primeira imagem do post, resolvida pelo File real."""
    match = IMG_RE.search(post.markdown or "")
    if not match:
        return None
    src = match.group(1)
    if src.startswith(("http://", "https://", "data:")):
        return src
    base = posixpath.dirname(post.file.src_uri)
    uri = posixpath.normpath(posixpath.join(base, src))
    found = files.get_file_from_path(uri)
    return found.url if found else None


def _readtime(post):
    cfg = getattr(post, "config", None)
    return getattr(cfg, "readtime", None) if cfg else None


def _date(post):
    cfg = getattr(post, "config", None)
    dates = getattr(cfg, "date", None) if cfg else None
    return getattr(dates, "created", None) if dates else None


def on_env(env, config, files, **kwargs):
    plugin = config.plugins.get("material/blog")
    if not plugin or not getattr(plugin, "blog", None):
        return env

    posts = []
    for post in plugin.blog.posts:
        meta = post.meta or {}
        created = _date(post)
        posts.append({
            "title": post.title,
            "url": post.file.url,
            "date": created,
            "date_label": _date_label(created),
            "readtime": _readtime(post),
            "categories": list(getattr(post.config, "categories", []) or []),
            "tags": list(getattr(post.config, "tags", []) or []),
            "thumb": _thumb_url(post, files),
            "series": meta.get("series"),
            "series_index": meta.get("series_index"),
        })

    # blog.posts ja vem do mais recente para o mais antigo
    config.extra["k_posts"] = posts

    series = {}
    for post in posts:
        name = post["series"]
        if not name:
            continue
        series.setdefault(name, []).append(post)

    # dentro da serie a ordem e crescente: parte 01, 02, 03...
    for name, items in series.items():
        items.sort(key=lambda p: (
            p["series_index"] if p["series_index"] is not None else 999,
            p["date"] or 0,
        ))

    # series mais recentes primeiro, pelo post mais novo de cada uma
    config.extra["k_series"] = sorted(
        ({"name": name, "posts": items} for name, items in series.items()),
        key=lambda s: max((p["date"] for p in s["posts"] if p["date"]), default=0),
        reverse=True,
    )

    return env
