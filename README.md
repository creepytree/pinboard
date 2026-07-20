<div align="center">

# <img src="https://raw.githubusercontent.com/creepytree/druidforms/main/assets/leaf_swatch.svg" width="42" alt="" align="center"> Pinboard

Mini webapp for pinning apps and notes

[![Docker Hub](https://img.shields.io/docker/pulls/bitdruid/pinboard?logo=docker&logoColor=white&label=docker%20pulls)](https://hub.docker.com/r/bitdruid/pinboard)

<a href="example.png"><img src="example.png" width="666" alt="Example"></a>

</div>

# about

A centered grid of round buttons linking to your services plus key/value notes below — a fast, shareable dashboard for internal services.

- round entry buttons with name, url, optional description (opened via eye icon) and optional image (file upload or url, stored as base64)
- edit mode: add, edit, delete and drag-reorder entries and notes
- key/value notes table below the buttons
- config export/import as json (edit mode)
- accent color switcher (persisted per browser, incl. favicon)
- application log in a dedicated tab (with level filtering)
- optional single-user login

# run

## docker

### get image
```bash
docker pull bitdruid/pinboard:latest
```
```bash
docker buildx build -t bitdruid/pinboard:latest . --load
```

### compose
```bash
docker-compose up -d
```

## script
```bash
bash start.sh [options]
```

Options:

- `-b, --base-path PATH` - Public base path when hosting under a subdirectory (example: `/subdir1/app`)
- `-u, --login-user USER` - Enable login with this username
- `-w, --login-pw PW` - Password for the login user
- `-t, --login-timeout MIN` - Session idle timeout in minutes (default: 60)
- `--help` - Show help message

## cli

- Python >= 3.13

```bash
pipx install .
# or: uv tool install .
pinboard
```

Options:

- `--host HOST` - Interface to bind the server to (default: 0.0.0.0)
- `--port PORT` - Port for the server (default: 5000)
- `--base-path PATH` - Public base path when hosting under a subdirectory (example: `/subdir1/app`)
- `--login-user USER` - Enable login with this username (requires `--login-pw`)
- `--login-pw PW` - Password for the login user (requires `--login-user`)
- `--login-timeout MIN` - Session idle timeout in minutes (default: 60)
- `--reload` - Auto-reload on code changes (development only)

## envs

| Variable        | Default                        | Description                                                                                 |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `BASE_PATH`     | _(empty)_                      | Public base path when hosting under a subdirectory (example: `/subdir1/app`)                |
| `LOG_LEVEL`     | `DEBUG`                        | `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL`                                          |
| `INSTANCE_DIR`  | `instance/` inside the package | Directory for instance data (database + log file), see [volumes](#volumes)                  |
| `LOGIN`         | `false`                        | Set to `true` to require login with `LOGIN_USER` / `LOGIN_PW`. Sessions are in-memory only. |
| `LOGIN_USER`    | _(empty)_                      | Username for the login                                                                      |
| `LOGIN_PW`      | _(empty)_                      | Password for the login                                                                      |
| `LOGIN_TIMEOUT` | `60`                           | Session idle timeout in minutes                                                             |

## volumes

| Volume                   | Description                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `/app/pinboard/instance` | Instance dir — `pinboard.db` (entries + notes) and `pinboard.log`; mount to persist |

---

> **Disclaimer:** fully agentic project — built entirely by AI against the [druidforms](https://github.com/creepytree/druidforms) design framework (see [AGENTS.md](AGENTS.md)).
