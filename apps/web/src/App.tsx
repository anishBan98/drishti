import { t } from '@drishti/shared';

// App shell placeholder until the eight screens land in milestone M3.
export function App() {
  return (
    <main className="shell">
      <h1 className="wordmark">
        drishti<span className="dot">.</span>
      </h1>
      <p className="tagline">{t('app.tagline')}</p>
    </main>
  );
}
