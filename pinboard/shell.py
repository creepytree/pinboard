"""The druids app shell instance for pinboard.

Design assets, base templates, theming and login/session handling all come
from the druids framework; this module wires it to pinboard's env/config.
"""

import os

from druids import Druids, LoginSettings

from pinboard.config import AUTHOR, BASE_PATH, GITHUB_URL, VERSION
from pinboard.env import env

_TEMPLATES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

druids = Druids(
    "Pinboard",
    version=VERSION,
    author=AUTHOR,
    github_url=GITHUB_URL,
    base_path=BASE_PATH,
    login=LoginSettings(
        user=env.login_user,
        password=env.login_password,
        timeout_minutes=env.login_timeout,
    )
    if env.login_enabled
    else None,
    templates_dir=_TEMPLATES,
)
