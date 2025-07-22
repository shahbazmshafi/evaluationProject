import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Home } from 'lucide-react';
import NavLink from '../../../components/atoms/NavLink';

describe('NavLink Component', () => {
  const defaultProps = {
    href: '/test',
    icon: Home,
    name: 'Test Link',
  };

  it('renders correctly with icon and name', () => {
    render(
      <BrowserRouter>
        <NavLink {...defaultProps} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Test Link')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies active styles when current path matches href', () => {
    render(
      <MemoryRouter initialEntries={['/test']}>
        <NavLink {...defaultProps} />
      </MemoryRouter>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('border-blue-500');
    expect(link).toHaveClass('text-blue-600');
  });

  it('applies inactive styles when current path does not match href', () => {
    render(
      <MemoryRouter initialEntries={['/other']}>
        <NavLink {...defaultProps} />
      </MemoryRouter>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('border-transparent');
    expect(link).toHaveClass('text-gray-500');
  });

  it('applies custom className', () => {
    render(
      <BrowserRouter>
        <NavLink {...defaultProps} className="custom-class" />
      </BrowserRouter>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});