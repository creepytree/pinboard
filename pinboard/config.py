"""Configuration settings for pinboard."""

from importlib.metadata import PackageNotFoundError, metadata

from pinboard.env import env


def get_project_config() -> dict:
    try:
        meta = metadata("pinboard")
    except PackageNotFoundError:
        return {"version": "dev", "author": "Unknown", "github_url": ""}

    version = meta["Version"]

    author = meta.get("Author")
    if not author:
        author_email = meta.get("Author-email", "")
        author = author_email.split("<")[0].strip()
    author = author or "Unknown"

    url = meta.get("Home-page")
    if not url:
        for project_url in meta.get_all("Project-URL", []):
            label, value = project_url.split(",", 1)
            if label.strip().lower() == "homepage":
                url = value.strip()
                break
    url = url or ""

    return {
        "version": version,
        "author": author,
        "github_url": url,
    }


cfg = get_project_config()

BASE_PATH = env.base_path

VERSION = cfg["version"]
AUTHOR = cfg["author"]
GITHUB_URL = cfg["github_url"]

# Maximum accepted size of a base64 image data URI (~2 MB source image).
MAX_IMAGE_CHARS = 3_000_000
