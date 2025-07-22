import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationButton from '../../../components/atoms/NotificationButton';

describe('NotificationButton Component', () => {
  it('renders correctly', () => {
    render(<NotificationButton />);
    
    // Check if the button is rendered
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<NotificationButton onClick={handleClick} />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<NotificationButton className="custom-class" />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveClass('custom-class');
  });
});