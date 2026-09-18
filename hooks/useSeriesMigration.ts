import { useEffect, useState } from 'react';
import { migrateSeriesOnce } from '@/helpers/seriesMigration';

/**
 * Runs the series backfill before any screen can read the book list.
 *
 * Always resolves, never rejects: a migration that threw and left the gate
 * closed would render nothing on every launch, for good. A library that failed
 * to group is a nuisance; an app that will not start is a reinstall.
 */
export function useSeriesMigration(): boolean {
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    migrateSeriesOnce()
      .catch((error) => console.log('[series] migration failed:', error instanceof Error ? error.message : error))
      .finally(() => {
        if (!cancelled) setIsDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return isDone;
}
