from pathlib import Path
from tempfile import TemporaryDirectory
import asyncio
import sys

from pydub import AudioSegment

REPO_ROOT = Path(__file__).resolve().parents[6]
BACKEND_ROOT = REPO_ROOT / 'jingle-extractor-backend'
sys.path.insert(0, str(BACKEND_ROOT))

import app.config as config


def main() -> None:
    with TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        config.DATA_DIR = tmpdir
        config.db_path = lambda: tmpdir / 'test.db'  # type: ignore[assignment]

        from app.database import Database

        original_init = Database.__init__
        Database.__init__ = lambda self, path=None: setattr(self, 'db_path', str(tmpdir / 'test.db'))  # type: ignore[method-assign]
        try:
            db = Database(tmpdir / 'test.db')
            db.create_tables()

            track_id = 'demo_track'
            track_dir = tmpdir / 'tracks' / track_id
            track_dir.mkdir(parents=True, exist_ok=True)

            for stem in ('orig', 'inst', 'vox'):
                AudioSegment.silent(duration=2000).export(
                    track_dir / f'{stem}.mp3',
                    format='mp3',
                    bitrate='192k',
                )

            db.create_track(track_id, str(track_dir / 'orig.mp3'), status='complete')
            db.insert_candidate(
                track_id,
                candidate_idx=1,
                rank=1,
                start=0.0,
                end=1.0,
                score=95,
                attack=90,
                ending=90,
                energy=90,
                vocal_overlap=False,
                is_best=True,
            )

            from app.models import ExportFormat, ExportRequest, StemType
            from app.routes.export import export_clip

            async def validate_stems() -> None:
                for stem in (StemType.ORIG, StemType.INST, StemType.VOX):
                    response = await export_clip(
                        ExportRequest(
                            trackId=track_id,
                            candidateId=1,
                            stem=stem,
                            fmt=ExportFormat.MP3,
                            fade_in=20,
                            fade_out=50,
                            br=192,
                        )
                    )
                    body = b''
                    async for chunk in response.body_iterator:
                        body += chunk

                    assert response.media_type == 'audio/mpeg', (stem.value, response.media_type)
                    assert len(body) > 0, (stem.value, 'empty response body')
                    print(f'{stem.value}: ok ({len(body)} bytes)')

            asyncio.run(validate_stems())
        finally:
            Database.__init__ = original_init  # type: ignore[method-assign]


if __name__ == '__main__':
    main()
