import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the child components and context
jest.mock('../../components/organisms/Header', () => {
  return function MockHeader({ userName, roleName }: { userName: string; roleName: string }) {
    return <header data-testid="header-component">{userName} - {roleName}</header>;
  };
});

jest.mock('../../components/molecules/Navigation', () => {
  return function MockNavigation({ items }: { items: any[] }) {
    return <nav data-testid="navigation-component">Items: {items.length}</nav>;
  };
});

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Test User',
      role: {
        name: 'Test Role',
        permissions: ['EVALUATION_READ', 'KPI_READ', 'USER_READ']
      }
    },
    logout: jest.fn(),
    isLoading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../utils/permissions', () => ({
  hasPermission: () => true,
  PERMISSIONS: {
    EVALUATION_READ: 'EVALUATION_READ',
    KPI_READ: 'KPI_READ',
    USER_READ: 'USER_READ',
    USER_WRITE: 'USER_WRITE'
  }
}));

describe('Layout Component', () => {
  it('renders header and navigation', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div data-testid="content">Content</div>
        </Layout>
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('header-component')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-component')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('passes user data to Header', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('header-component')).toHaveTextContent('Test User - Test Role');
  });

  it('creates navigation items based on permissions', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );
    
    // With all permissions mocked to return true, we should have 6 navigation items
    // (Dashboard, Evaluations, KPIs, Users, Role Management, Settings)
    expect(screen.getByTestId('navigation-component')).toHaveTextContent('Items: 6');
  });
});