"""Recreate the bundled Windows runtime from pinned, checksum-verified packages."""
import base64
import hashlib
import io
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = json.loads((ROOT / 'integrations/agent-reach/runtime-lock.json').read_text())
DEST = ROOT / 'vendor-runtime/agent-reach/python'


def fetch(item, algorithm='sha256'):
    with urllib.request.urlopen(item['url'], timeout=90) as response:
        data = response.read(80 * 1024 * 1024 + 1)
    if len(data) > 80 * 1024 * 1024:
        raise ValueError('Package exceeds size limit')
    if algorithm == 'sha512':
        if base64.b64encode(hashlib.sha512(data).digest()).decode() != item['sha512_base64']:
            raise ValueError('Python checksum mismatch')
    else:
        if hashlib.sha256(data).hexdigest() != item['sha256']:
            raise ValueError('Wheel checksum mismatch')
    return zipfile.ZipFile(io.BytesIO(data))


def write(z, prefix, destination):
    for name in z.namelist():
        if not name.startswith(prefix) or name.endswith('/'):
            continue
        relative = Path(name).relative_to(prefix) if prefix else Path(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe archive path')
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(name))


def main():
    staging = DEST.with_name('python-staging')
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    try:
        with fetch(LOCK['python'], 'sha512') as z:
            write(z, 'tools/', staging)
        for wheel in LOCK['wheels']:
            with fetch(wheel) as z:
                write(z, '', staging / 'Lib/site-packages')
        # Headers/static import libraries are build tools, not runtime components.
        for folder in ('include', 'libs'):
            shutil.rmtree(staging / folder, ignore_errors=True)
        if DEST.exists():
            shutil.rmtree(DEST)
        staging.rename(DEST)
        print('Prepared verified Python', LOCK['python']['version'], 'and', len(LOCK['wheels']), 'pinned Windows wheels')
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == '__main__':
    main()
