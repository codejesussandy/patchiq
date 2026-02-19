import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { MailServerConfiguration } from '../../../pages/settings/MailServerConfiguration';
import { ProxyServerConfiguration } from '../../../pages/settings/ProxyServerConfiguration';
import { ServerSettings } from '../../../pages/settings/ServerSettings';
import { RiskScoreSettings } from '../../../pages/settings/RiskScoreSettings';
import { RemoteDesktopSettings } from '../../../pages/settings/RemoteDesktopSettings';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

const mockMailConfig = {
  host: 'smtp.example.com',
  port: 587,
  protocol: 'TLS',
  fromAddress: 'noreply@example.com',
  username: 'mailuser',
  password: 'mailpass',
};

const mockProxyConfig = {
  enabled: true,
  host: 'proxy.example.com',
  port: 8080,
  protocol: 'HTTP',
};

const mockServerSettings = {
  sessionTimeout: true,
  sessionTimeoutMinutes: 60,
  sessionIdleTimeoutMinutes: 15,
  endpointOnlineStatusTimeoutHours: 1,
  endpointScanJobTimeoutHours: 2,
  logLevel: 'Info',
};

const mockRiskScore = {
  applyDefaultSettings: false,
  vulnerabilityScoreWeight: 0.5,
  vulnerabilitySeverityWeight: 0.3,
  threatsWeight: 0.1,
  endpointVisitsWeight: 0.1,
};

const mockRemoteDesktopSettings = {
  connectionType: 'Local',
  remoteSessionIndicator: false,
  userConsent: true,
};

describe('Mail Server Configuration', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/mail-server', () => {
        return HttpResponse.json({ success: true, data: mockMailConfig });
      })
    );
  });

  it('renders current mail server config from API', async () => {
    render(<MailServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('smtp.example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Mail Server Configurations')).toBeInTheDocument();
    expect(screen.getByLabelText(/smtp host/i)).toBeInTheDocument();
  });

  it('saves updated configuration', async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put('*/settings/mail-server', async () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: mockMailConfig });
      })
    );

    render(<MailServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('smtp.example.com')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
  });

  it('tests mail server connection', async () => {
    const user = userEvent.setup();
    let testCalled = false;

    server.use(
      http.post('*/settings/mail-server/test', async () => {
        testCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    render(<MailServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('smtp.example.com')).toBeInTheDocument();
    });

    // Fill in test email
    const testEmailInput = screen.getByPlaceholderText('recipient@example.com');
    await user.type(testEmailInput, 'test@example.com');

    await user.click(screen.getByRole('button', { name: /test/i }));

    await waitFor(() => {
      expect(testCalled).toBe(true);
    });
  });
});

describe('Proxy Server Configuration', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/proxy-server', () => {
        return HttpResponse.json({ success: true, data: mockProxyConfig });
      })
    );
  });

  it('renders current proxy config', async () => {
    render(<ProxyServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Proxy Server Configurations')).toBeInTheDocument();
    });

    // When enabled is true, the host input should appear
    await waitFor(() => {
      expect(screen.getByDisplayValue('proxy.example.com')).toBeInTheDocument();
    });
  });

  it('saves updated configuration', async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put('*/settings/proxy-server', async () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: mockProxyConfig });
      })
    );

    render(<ProxyServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('proxy.example.com')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
  });

  it('tests proxy connection', async () => {
    const user = userEvent.setup();
    let testCalled = false;

    server.use(
      http.post('*/settings/proxy-server/test', async () => {
        testCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    render(<ProxyServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('proxy.example.com')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /test/i }));

    await waitFor(() => {
      expect(testCalled).toBe(true);
    });
  });
});

describe('Server Settings', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/server', () => {
        return HttpResponse.json({ success: true, data: mockServerSettings });
      })
    );
  });

  it('renders current server settings', async () => {
    render(<ServerSettings />);

    await waitFor(() => {
      expect(screen.getByText('Server Settings')).toBeInTheDocument();
    });

    // These text labels appear in the UI as custom labels (not Form.Item labels)
    expect(screen.getAllByText(/session timeout/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/log level/i).length).toBeGreaterThan(0);
  });

  it('saves updated settings', async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put('*/settings/server', async () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: mockServerSettings });
      })
    );

    render(<ServerSettings />);

    await waitFor(() => {
      expect(screen.getByText('Server Settings')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
  });
});

describe('Risk Score Settings', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/risk-score', () => {
        return HttpResponse.json({ success: true, data: mockRiskScore });
      })
    );
  });

  it('renders risk score weights', async () => {
    render(<RiskScoreSettings />);

    await waitFor(() => {
      expect(screen.getByText('Risk Score Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Vulnerability Score Weight')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability Severity Weight')).toBeInTheDocument();
    expect(screen.getByText('Threats Weight')).toBeInTheDocument();
    expect(screen.getByText('Endpoint Visits Weight')).toBeInTheDocument();
    expect(screen.getByText('Apply Default settings to calculate Risk Score')).toBeInTheDocument();
  });

  it('saves updated weights', async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put('*/settings/risk-score', async () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: mockRiskScore });
      })
    );

    render(<RiskScoreSettings />);

    await waitFor(() => {
      expect(screen.getByText('Risk Score Settings')).toBeInTheDocument();
    });

    // RiskScoreSettings uses custom button labels: Save and Reset
    const saveBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Save');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
  });
});

describe('Remote Desktop Settings', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/remote-desktop', () => {
        return HttpResponse.json({ success: true, data: mockRemoteDesktopSettings });
      })
    );
  });

  it('renders remote desktop config', async () => {
    render(<RemoteDesktopSettings />);

    await waitFor(() => {
      expect(screen.getByText('Remote Desktop Settings')).toBeInTheDocument();
    });

    // Wait for data to load (Spin is shown while loading)
    await waitFor(() => {
      expect(screen.getByText(/connection type/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/remote session indicator/i)).toBeInTheDocument();
    expect(screen.getByText(/user consent/i)).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('saves updated settings', async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put('*/settings/remote-desktop', async () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: mockRemoteDesktopSettings });
      })
    );

    render(<RemoteDesktopSettings />);

    // Wait for save button to appear (data loaded)
    await waitFor(() => {
      const saveBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Save');
      expect(saveBtn).toBeTruthy();
    });

    const saveBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Save');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
  });

  it('resets to defaults', async () => {
    const user = userEvent.setup();
    let resetCalled = false;

    server.use(
      http.post('*/settings/remote-desktop/reset', async () => {
        resetCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    render(<RemoteDesktopSettings />);

    // Wait for Reset button to appear (data loaded)
    await waitFor(() => {
      const resetBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Reset');
      expect(resetBtn).toBeTruthy();
    });

    const resetBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Reset');
    await user.click(resetBtn);

    await waitFor(() => {
      expect(resetCalled).toBe(true);
    });
  });
});
