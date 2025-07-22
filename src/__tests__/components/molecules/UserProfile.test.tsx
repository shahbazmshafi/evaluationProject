import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfile from '../../../components/molecules/UserProfile';

describe('UserProfile Component', () => {
  const defaultProps = {
    userName: 'John Doe',
    roleName: 'Admin',
    onLogout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user name and role correctly', () => {
    render(<UserProfile {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('displays "Unknown Role" when roleName is empty', () => {
    render(<UserProfile {...defaultProps} roleName="" />);
    
    expect(screen.getByText('Unknown Role')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    render(<UserProfile {...defaultProps} />);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<UserProfile {...defaultProps} className="custom-class" />);
    
    const container = screen.getByText('John Doe').closest('div');
    expect(container?.parentElement).toHaveClass('custom-class');
  });
});