import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../../components/organisms/Header';

// Mock the child components to focus on testing Header's functionality
jest.mock('../../../components/atoms/Logo', () => {
  return function MockLogo() {
    return <div data-testid="logo-component">Logo</div>;
  };
});

jest.mock('../../../components/atoms/NotificationButton', () => {
  return function MockNotificationButton({ onClick }: { onClick?: () => void }) {
    return <button data-testid="notification-button" onClick={onClick}>Notifications</button>;
  };
});

jest.mock('../../../components/molecules/UserProfile', () => {
  return function MockUserProfile({ 
    userName, 
    roleName, 
    onLogout 
  }: { 
    userName: string; 
    roleName: string; 
    onLogout: () => void 
  }) {
    return (
      <div data-testid="user-profile">
        <span>{userName}</span>
        <span>{roleName}</span>
        <button onClick={onLogout}>Logout</button>
      </div>
    );
  };
});

describe('Header Component', () => {
  const defaultProps = {
    userName: 'John Doe',
    roleName: 'Admin',
    onLogout: jest.fn(),
    onNotificationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all child components', () => {
    render(
      <BrowserRouter>
        <Header {...defaultProps} />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('logo-component')).toBeInTheDocument();
    expect(screen.getByTestId('notification-button')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('passes onLogout to UserProfile', () => {
    render(
      <BrowserRouter>
        <Header {...defaultProps} />
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByText('Logout'));
    expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
  });

  it('passes onNotificationClick to NotificationButton', () => {
    render(
      <BrowserRouter>
        <Header {...defaultProps} />
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByTestId('notification-button'));
    expect(defaultProps.onNotificationClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(
      <BrowserRouter>
        <Header {...defaultProps} className="custom-class" />
      </BrowserRouter>
    );
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-class');
  });
});