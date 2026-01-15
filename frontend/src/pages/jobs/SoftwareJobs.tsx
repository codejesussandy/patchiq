import { useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Typography, Tabs } from 'antd';
import { SoftwareJobsCatalog } from './SoftwareJobsCatalog';
import { SoftwareJobsBundle } from './SoftwareJobsBundle';
import { SoftwareJobsDeployed } from './SoftwareJobsDeployed';

const { Title } = Typography;

export const SoftwareJobs = () => {
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
        navigate('/jobs/software-jobs/catalog');
        break;
      case 'bundle':
        navigate('/jobs/software-jobs/bundle');
        break;
      case 'deployed':
        navigate('/jobs/software-jobs/deployed');
        break;
      default:
        navigate('/jobs/software-jobs/catalog');
    }
  };

  // Redirect to catalog if on base software-jobs path
  useEffect(() => {
    if (location.pathname === '/jobs/software-jobs' || location.pathname === '/jobs/software-jobs/') {
      navigate('/jobs/software-jobs/catalog', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === '/jobs/software-jobs' || location.pathname === '/jobs/software-jobs/') {
    return null;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Software Jobs</Title>
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
          <Route path="catalog" element={<SoftwareJobsCatalog />} />
          <Route path="bundle" element={<SoftwareJobsBundle />} />
          <Route path="deployed" element={<SoftwareJobsDeployed />} />
        </Routes>
      </div>
    </div>
  );
};
