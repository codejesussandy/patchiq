import { http, HttpResponse } from 'msw';
import type { Category, SubCategory } from '../../types/asset.types';

const API_BASE_URL = '/v1';

// Mock data
let categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Workstations',
    description: 'Desktop and laptop computers for office use',
    color: 'blue',
    assetCount: 24,
    owner: 'John Smith',
    manager: 'Sarah Johnson',
    priority: 'High',
    budget: '$50,000',
    status: 'Active',
    tags: ['office', 'desktop', 'productivity'],
    maintenanceSchedule: 'Monthly',
    slaTarget: '99.5%',
    complianceRequired: true,
    complianceTags: ['ISO27001', 'GDPR'],
  },
  {
    id: 'cat-2',
    name: 'Servers',
    description: 'Physical and virtual servers',
    color: 'cyan',
    assetCount: 8,
    owner: 'Mike Davis',
    manager: 'Alex Chen',
    priority: 'Critical',
    budget: '$100,000',
    status: 'Active',
    tags: ['infrastructure', 'critical', 'production'],
    maintenanceSchedule: 'Weekly',
    slaTarget: '99.99%',
    complianceRequired: true,
    complianceTags: ['SOC2', 'HIPAA'],
  },
  {
    id: 'cat-3',
    name: 'Mobile Devices',
    description: 'Smartphones and tablets',
    color: 'green',
    assetCount: 45,
    owner: 'Emma Wilson',
    manager: 'Tom Brown',
    priority: 'Medium',
    budget: '$75,000',
    status: 'Active',
    tags: ['mobile', 'field', 'remote'],
    maintenanceSchedule: 'Quarterly',
    slaTarget: '98%',
    complianceRequired: false,
  },
];

let subCategories: SubCategory[] = [
  {
    id: 'subcat-1',
    categoryId: 'cat-1',
    name: 'Windows PCs',
    description: 'Windows-based desktop computers',
    criticality: 'High',
    businessUnit: 'Engineering',
    department: 'IT',
    assetCount: 15,
    owner: 'Robert Lee',
    manager: 'Sarah Johnson',
    priority: 'High',
    status: 'Active',
    uptime: '99.5%',
    maintenanceWindow: 'Every 2nd Sunday',
    tags: ['windows', 'corporate', 'core'],
  },
  {
    id: 'subcat-2',
    categoryId: 'cat-1',
    name: 'MacBooks',
    description: 'Apple MacBook laptops',
    criticality: 'Medium',
    businessUnit: 'Design',
    department: 'IT',
    assetCount: 9,
    owner: 'Lisa Wong',
    manager: 'Sarah Johnson',
    priority: 'Medium',
    status: 'Active',
    uptime: '98.5%',
    maintenanceWindow: 'Monthly',
    tags: ['macos', 'design', 'creative'],
  },
  {
    id: 'subcat-3',
    categoryId: 'cat-2',
    name: 'Web Servers',
    description: 'Apache and Nginx web servers',
    criticality: 'Critical',
    businessUnit: 'Operations',
    department: 'Infrastructure',
    assetCount: 4,
    owner: 'James White',
    manager: 'Alex Chen',
    priority: 'Critical',
    status: 'Active',
    uptime: '99.99%',
    maintenanceWindow: 'Rolling maintenance',
    tags: ['web', 'production', 'critical', 'public-facing'],
  },
  {
    id: 'subcat-4',
    categoryId: 'cat-3',
    name: 'iOS Devices',
    description: 'Apple iPhone and iPad devices',
    criticality: 'Medium',
    businessUnit: 'Sales',
    department: 'IT',
    assetCount: 20,
    owner: 'Patricia Johnson',
    manager: 'Tom Brown',
    priority: 'Medium',
    status: 'Active',
    uptime: '97%',
    maintenanceWindow: 'As needed',
    tags: ['ios', 'mobile', 'field-sales'],
  },
];

export const categoryHandlers = [
  // Get all categories
  http.get(`${API_BASE_URL}/categories`, () => {
    return HttpResponse.json(categories);
  }),

  // Get single category with sub-categories
  http.get(`${API_BASE_URL}/categories/:categoryId`, ({ params }) => {
    const category = categories.find((c) => c.id === params.categoryId);
    if (!category) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const subs = subCategories.filter((s) => s.categoryId === params.categoryId);
    return HttpResponse.json({ ...category, subCategories: subs });
  }),

  // Create category
  http.post(`${API_BASE_URL}/categories`, async ({ request }) => {
    const body: any = await request.json();
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: body.name,
      description: body.description,
      color: body.color,
      assetCount: 0,
    };
    categories.push(newCategory);
    return HttpResponse.json(newCategory, { status: 201 });
  }),

  // Update category
  http.put(`${API_BASE_URL}/categories/:categoryId`, async ({ params, request }) => {
    const category = categories.find((c) => c.id === params.categoryId);
    if (!category) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const body: any = await request.json();
    const updated = { ...category, ...body };
    const index = categories.findIndex((c) => c.id === params.categoryId);
    categories[index] = updated;
    return HttpResponse.json(updated);
  }),

  // Delete category
  http.delete(`${API_BASE_URL}/categories/:categoryId`, ({ params }) => {
    categories = categories.filter((c) => c.id !== params.categoryId);
    return HttpResponse.json({ success: true }, { status: 204 });
  }),

  // Get all sub-categories
  http.get(`${API_BASE_URL}/sub-categories`, ({ request }) => {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    if (categoryId) {
      return HttpResponse.json(subCategories.filter((s) => s.categoryId === categoryId));
    }
    return HttpResponse.json(subCategories);
  }),

  // Get single sub-category
  http.get(`${API_BASE_URL}/sub-categories/:subCategoryId`, ({ params }) => {
    const subCategory = subCategories.find((s) => s.id === params.subCategoryId);
    if (!subCategory) {
      return HttpResponse.json({ error: 'Sub-category not found' }, { status: 404 });
    }
    return HttpResponse.json(subCategory);
  }),

  // Create sub-category
  http.post(`${API_BASE_URL}/sub-categories`, async ({ request }) => {
    const body: any = await request.json();
    const newSubCategory: SubCategory = {
      id: `subcat-${Date.now()}`,
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      criticality: body.criticality || 'Medium',
      businessUnit: body.businessUnit,
      department: body.department,
      assetCount: 0,
    };
    subCategories.push(newSubCategory);
    return HttpResponse.json(newSubCategory, { status: 201 });
  }),

  // Update sub-category
  http.put(`${API_BASE_URL}/sub-categories/:subCategoryId`, async ({ params, request }) => {
    const subCategory = subCategories.find((s) => s.id === params.subCategoryId);
    if (!subCategory) {
      return HttpResponse.json({ error: 'Sub-category not found' }, { status: 404 });
    }
    const body: any = await request.json();
    const updated = { ...subCategory, ...body };
    const index = subCategories.findIndex((s) => s.id === params.subCategoryId);
    subCategories[index] = updated;
    return HttpResponse.json(updated);
  }),

  // Delete sub-category
  http.delete(`${API_BASE_URL}/sub-categories/:subCategoryId`, ({ params }) => {
    subCategories = subCategories.filter((s) => s.id !== params.subCategoryId);
    return HttpResponse.json({ success: true }, { status: 204 });
  }),

  // Get assets by category
  http.get(`${API_BASE_URL}/categories/:categoryId/assets`, () => {
    // This would return filtered assets - for now returning empty array
    return HttpResponse.json([]);
  }),

  // Get assets by sub-category
  http.get(`${API_BASE_URL}/sub-categories/:subCategoryId/assets`, () => {
    // This would return filtered assets - for now returning empty array
    return HttpResponse.json([]);
  }),
];
