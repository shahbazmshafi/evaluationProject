import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home, Settings, Users } from 'lucide-react';
import Navigation, { NavItem } from '../../../components/molecules/Navigation';

// Mock the NavLink component to avoid testing its implementation details
jest.mock('../../../components/atoms/NavLink', () => {
  return function MockNavLink({ name, href }: { name: string; href: string }) {
    return <a href={href} data-testid={`navlink-${name}`}>{name}</a>;
  };
});

describe('Navigation Component', () => {
  const navItems: NavItem[] = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Users', icon: Users, href: '/users' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  it('renders all navigation items', () => {
    render(
      <BrowserRouter>
        <Navigation items={navItems} />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('navlink-Home')).toBeInTheDocument();
    expect(screen.getByTestId('navlink-Users')).toBeInTheDocument();
    expect(screen.getByTestId('navlink-Settings')).toBeInTheDocument();
  });

  it('renders no items when empty array is provided', () => {
    render(
      <BrowserRouter>
        <Navigation items={[]} />
      </BrowserRouter>
    );
    
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('a')).toHaveLength(0);
  });

  it('applies custom className', () => {
    render(
      <BrowserRouter>
        <Navigation items={navItems} className="custom-class" />
      </BrowserRouter>
    );
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });
});