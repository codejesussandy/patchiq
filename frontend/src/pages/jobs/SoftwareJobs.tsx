import { useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Typography, Tabs } from 'antd';
import { SoftwareJobsCatalog } from './SoftwareJobsCatalog';
import { SoftwareJobsBundle } from './SoftwareJobsBundle';
import { SoftwareJobsDeployed } from './SoftwareJobsDeployed';
import { PatchJobsDeployed } from './PatchJobsDeployed';

const { Title } = Typography;

export const SoftwareJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname.includes('/catalog')) return 'catalog';
    if (location.pathname.includes('/bundle')) return 'bundle';
    if (location.pathname.includes('/patch-deployments')) return 'patch-deployments';
    if (location.pathname.includes('/deployed')) return 'deployed';
    return 'catalog';
  };

  const handleTabChange = (key: string) => {
    switch (key) {
      case 'catalog':
        navigate('/patches/deployed/catalog');
        break;
      case 'bundle':
        navigate('/patches/deployed/bundle');
        break;
      case 'deployed':
        navigate('/patches/deployed/deployed');
        break;
      case 'patch-deployments':
        navigate('/patches/deployed/patch-deployments');
        break;
      default:
        navigate('/patches/deployed/catalog');
    }
  };

  // Redirect to catalog if on base path
  useEffect(() => {
    if (location.pathname === '/patches/deployed' || location.pathname === '/patches/deployed/') {
      navigate('/patches/deployed/catalog', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === '/patches/deployed' || location.pathname === '/patches/deployed/') {
    return null;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Patches Deployed</Title>
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
            label: 'Software Deployed',
          },
          {
            key: 'patch-deployments',
            label: 'Patch Deployments',
          },
        ]}
      />
      <div style={{ marginTop: 24 }}>
        <Routes>
          <Route path="catalog" element={<SoftwareJobsCatalog />} />
          <Route path="bundle" element={<SoftwareJobsBundle />} />
          <Route path="deployed" element={<SoftwareJobsDeployed />} />
          <Route path="patch-deployments" element={<PatchJobsDeployed />} />
        </Routes>
      </div>
    </div>
  );
};
