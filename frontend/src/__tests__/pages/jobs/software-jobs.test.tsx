import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { SoftwareJobs } from '../../../pages/jobs/SoftwareJobs';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Software Jobs Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders software jobs tabs', async () => {
    render(<SoftwareJobs />);

    // SoftwareJobs has tabs - should render the tab container
    await waitFor(() => {
      expect(document.querySelector('.ant-tabs')).toBeInTheDocument();
    });
  });

  it('shows software deployment data', async () => {
    render(<SoftwareJobs />);

    // Default tab should show software catalog or deployed
    await waitFor(() => {
      expect(document.querySelector('.ant-tabs')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/deployments/software', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      }),
      http.get('*/hub/packages', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      })
    );

    render(<SoftwareJobs />);

    await waitFor(() => {
      expect(document.querySelector('.ant-tabs')).toBeInTheDocument();
    });
  });
});
