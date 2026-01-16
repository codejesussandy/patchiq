import { useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Typography, Tabs } from 'antd';
import { ConfigurationJobsCatalog } from './ConfigurationJobsCatalog';
import { ConfigurationJobsBundle } from './ConfigurationJobsBundle';
import { ConfigurationJobsDeployed } from './ConfigurationJobsDeployed';

const { Title } = Typography;

export const ConfigurationJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname.includes('/catalog')) return 'catalog';
    if (location.pathname.includes('/bundle')) return 'bundle';
    if (location.pathname.includes('/deployed')) return 'deployed';
    return 'catalog';
  };

  const handleTabChange = (key: string) => {
    switch (key) {
      case 'catalog':
        navigate('/jobs/configuration-jobs/catalog');
        break;
      case 'bundle':
        navigate('/jobs/configuration-jobs/bundle');
        break;
      case 'deployed':
        navigate('/jobs/configuration-jobs/deployed');
        break;
      default:
        navigate('/jobs/configuration-jobs/catalog');
    }
  };

  // Redirect to catalog if on base configuration-jobs path
  useEffect(() => {
    if (location.pathname === '/jobs/configuration-jobs' || location.pathname === '/jobs/configuration-jobs/') {
      navigate('/jobs/configuration-jobs/catalog', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === '/jobs/configuration-jobs' || location.pathname === '/jobs/configuration-jobs/') {
    return null;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Configuration Jobs</Title>
      <Tabs
        activeKey={getActiveTab()}
        onChange={handleTabChange}
        items={[
          {
            key: 'catalog',
            label: 'Catalog',
          },
          {
            key: 'bundle',
            label: 'Bundle',
          },
          {
            key: 'deployed',
            label: 'Deployed',
          },
        ]}
      />
      <div style={{ marginTop: 24 }}>
        <Routes>
          <Route path="catalog" element={<ConfigurationJobsCatalog />} />
          <Route path="bundle" element={<ConfigurationJobsBundle />} />
          <Route path="deployed" element={<ConfigurationJobsDeployed />} />
        </Routes>
      </div>
    </div>
  );
};
