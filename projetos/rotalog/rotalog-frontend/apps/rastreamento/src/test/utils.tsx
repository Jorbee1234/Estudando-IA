import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderComQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

export function mockLeaflet() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { leafletFake } = require('./leafletFake');
  return { __esModule: true, default: leafletFake.L, ...leafletFake.L };
}
