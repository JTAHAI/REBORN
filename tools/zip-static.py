"""Deterministic ZIP of directory CONTENTS. Python stdlib, no runtime dependency."""
from pathlib import Path
import sys, zipfile
source=Path(sys.argv[1]).resolve(); target=Path(sys.argv[2]).resolve()
if not source.is_dir() or target.is_relative_to(source):
    raise ValueError('Supply a source directory and output ZIP outside it')
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in sorted(source.rglob('*')):
        if file.is_symlink(): raise ValueError('Do not ship symbolic links')
        if file.is_file():
            info=zipfile.ZipInfo(file.relative_to(source).as_posix(),date_time=(2026,9,26,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,file.read_bytes(),compresslevel=9)
with zipfile.ZipFile(target) as z:
    if z.testzip(): raise ValueError('Corrupt output archive')
print(str(target))
